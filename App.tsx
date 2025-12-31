
import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  RefreshCw, 
  Table as TableIcon, 
  MessageSquare,
  ChevronRight,
  Database,
  Info,
  Users,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  FolderOpen,
  Filter,
  Search,
  X
} from 'lucide-react';
import { AggregatedData, ProcessingStatus, ComparisonResult } from './types';
import { processExcelFiles, exportToExcel, compareCustomerData } from './services/excelProcessor';
import { analyzeWithAi } from './services/geminiService';

type Tab = 'aggregate' | 'compare';

interface TableFilters {
  donVi: string;
  minTieuThu: string;
  minThanhTien: string;
  minVAT: string;
  minTongTien: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('aggregate');
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  
  const [status, setStatus] = useState<ProcessingStatus>({
    totalFiles: 0,
    processedFiles: 0,
    status: 'idle',
    message: ''
  });

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TableFilters>({
    donVi: '',
    minTieuThu: '',
    minThanhTien: '',
    minVAT: '',
    minTongTien: '',
  });

  // Comparison State
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);

  const handleAggregateFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = (Array.from(files) as File[]).filter(file => 
      /\.(xlsx|xls|csv)$/i.test(file.name)
    );

    if (fileList.length === 0) {
      setStatus({ ...status, status: 'error', message: 'Không tìm thấy file bảng tính hợp lệ trong folder!' });
      return;
    }

    setStatus({
      totalFiles: fileList.length,
      processedFiles: 0,
      status: 'processing',
      message: `Đang tổng hợp dữ liệu từ ${fileList.length} file...`
    });

    try {
      const result = await processExcelFiles(fileList);
      setAggregatedData(result);
      setStatus({
        ...status,
        status: 'completed',
        processedFiles: fileList.length,
        message: `Đã tổng hợp thành công ${fileList.length} file!`
      });
    } catch (error) {
      console.error(error);
      setStatus({ ...status, status: 'error', message: 'Lỗi trong quá trình xử lý file.' });
    }
  };

  const handleComparison = async () => {
    if (!oldFile || !newFile) {
      alert("Vui lòng chọn cả file tháng trước và file tháng sau!");
      return;
    }

    setStatus({
      totalFiles: 2,
      processedFiles: 0,
      status: 'processing',
      message: 'Đang phân tích biến động khách hàng...'
    });

    try {
      const result = await compareCustomerData(oldFile, newFile);
      setComparisonResult(result);
      setStatus({
        ...status,
        status: 'completed',
        processedFiles: 2,
        message: 'So sánh dữ liệu hoàn tất!'
      });
    } catch (error) {
      console.error(error);
      setStatus({ ...status, status: 'error', message: 'Lỗi khi so sánh dữ liệu.' });
    }
  };

  const filteredData = useMemo(() => {
    return aggregatedData.filter(item => {
      const matchesDonVi = item.donVi.toLowerCase().includes(filters.donVi.toLowerCase());
      const matchesTieuThu = filters.minTieuThu === '' || item.tongTieuThu >= parseFloat(filters.minTieuThu);
      const matchesThanhTien = filters.minThanhTien === '' || item.tongThanhTien >= parseFloat(filters.minThanhTien);
      const matchesVAT = filters.minVAT === '' || item.tongPhiVAT >= parseFloat(filters.minVAT);
      const matchesTongTien = filters.minTongTien === '' || item.tongTien >= parseFloat(filters.minTongTien);
      
      return matchesDonVi && matchesTieuThu && matchesThanhTien && matchesVAT && matchesTongTien;
    });
  }, [aggregatedData, filters]);

  const handleAiAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToAnalyze = activeTab === 'aggregate' ? filteredData : comparisonResult;
    if (!aiQuery.trim() || !dataToAnalyze) return;

    setIsAiLoading(true);
    setAiResponse('');
    try {
      const response = await analyzeWithAi(dataToAnalyze as any, aiQuery);
      setAiResponse(response);
    } catch (error) {
      setAiResponse("Lỗi phân tích AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
  };

  const clearFilters = () => {
    setFilters({
      donVi: '',
      minTieuThu: '',
      minThanhTien: '',
      minVAT: '',
      minTongTien: '',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <FileSpreadsheet className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Utility Aggregator</h1>
          </div>
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('aggregate')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'aggregate' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tổng hợp sản lượng
            </button>
            <button 
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'compare' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              So sánh khách hàng
            </button>
          </nav>
          <div className="flex items-center space-x-2">
            {activeTab === 'aggregate' && aggregatedData.length > 0 && (
              <button 
                onClick={() => exportToExcel(filteredData, 'tong_hop_san_luong.xlsx')} 
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                <span>Xuất Báo Cáo</span>
              </button>
            )}
            {activeTab === 'compare' && comparisonResult && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => exportToExcel(comparisonResult.newCustomers, 'khach_hang_moi.xlsx')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                >
                  <UserPlus size={14} /> <span>Mới</span>
                </button>
                <button 
                  onClick={() => exportToExcel(comparisonResult.cancelledCustomers, 'khach_hang_huy.xlsx')} 
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                >
                  <UserMinus size={14} /> <span>Hủy</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Aggregation Feature */}
        {activeTab === 'aggregate' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="max-w-xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-2">
                  <FolderOpen size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Tổng hợp dữ liệu theo Đơn vị</h2>
                  <p className="text-slate-500 mt-2">Chọn folder chứa tất cả các file cần tổng hợp sản lượng.</p>
                </div>
                
                <div className="relative group">
                  <input 
                    type="file" 
                    // @ts-ignore
                    webkitdirectory="" 
                    directory="" 
                    multiple 
                    onChange={handleAggregateFiles} 
                    className="hidden" 
                    id="agg-folder" 
                  />
                  <label 
                    htmlFor="agg-folder" 
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all shadow-sm"
                  >
                    <FolderOpen className="w-10 h-10 mb-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-sm font-semibold text-slate-700">Chọn Folder Dữ Liệu</span>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ .xlsx, .xls, .csv</p>
                  </label>
                </div>

                {status.status !== 'idle' && (
                  <div className={`p-4 rounded-xl text-sm flex items-center justify-center space-x-3 shadow-inner ${
                    status.status === 'processing' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                    status.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {status.status === 'processing' && <RefreshCw className="animate-spin" size={18} />}
                    {status.status === 'completed' && <Info size={18} />}
                    <span className="font-medium">{status.message}</span>
                  </div>
                )}
              </div>
            </section>

            {aggregatedData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Filter Bar */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center space-x-2 text-slate-700">
                          <Filter size={18} className="text-emerald-600" />
                          <span className="font-bold">Bộ lọc dữ liệu</span>
                       </div>
                       <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`text-xs px-3 py-1 rounded-full transition-colors ${showFilters ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {showFilters ? 'Ẩn bộ lọc' : 'Hiện thêm bộ lọc'}
                          </button>
                          <button 
                            onClick={clearFilters}
                            className="text-xs px-3 py-1 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition-colors"
                          >
                            Xóa lọc
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                             type="text"
                             placeholder="Tìm Đơn vị..."
                             value={filters.donVi}
                             onChange={(e) => setFilters({...filters, donVi: e.target.value})}
                             className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:border-emerald-500 outline-none text-sm transition-all shadow-inner"
                          />
                       </div>

                       {showFilters && (
                         <>
                           <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase w-20">T.Thụ Min</span>
                              <input 
                                 type="number"
                                 placeholder="0"
                                 value={filters.minTieuThu}
                                 onChange={(e) => setFilters({...filters, minTieuThu: e.target.value})}
                                 className="flex-grow px-3 py-2 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:border-emerald-500 outline-none text-sm transition-all shadow-inner"
                              />
                           </div>
                           <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase w-20">Tiền Min</span>
                              <input 
                                 type="number"
                                 placeholder="0"
                                 value={filters.minTongTien}
                                 onChange={(e) => setFilters({...filters, minTongTien: e.target.value})}
                                 className="flex-grow px-3 py-2 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:border-emerald-500 outline-none text-sm transition-all shadow-inner"
                              />
                           </div>
                         </>
                       )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center space-x-2">
                        <Database className="text-emerald-600" size={20} />
                        <h3 className="font-bold text-slate-900 text-lg">Bảng Tổng Hợp Chi Tiết</h3>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {filteredData.length} Đơn vị {filteredData.length < aggregatedData.length && `(Đang lọc từ ${aggregatedData.length})`}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100 font-bold">
                          <tr>
                            <th className="px-6 py-4">Đơn vị</th>
                            <th className="px-6 py-4 text-right">Số KH</th>
                            <th className="px-6 py-4 text-right">Tiêu thụ</th>
                            <th className="px-6 py-4 text-right">Thành tiền</th>
                            <th className="px-6 py-4 text-right">VAT</th>
                            <th className="px-6 py-4 text-right text-emerald-700 bg-emerald-50/30">Tổng cộng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredData.length > 0 ? (
                            filteredData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-900">{item.donVi}</td>
                                <td className="px-6 py-4 text-right font-medium">{formatNumber(item.soLuongKhachHang)}</td>
                                <td className="px-6 py-4 text-right">{formatNumber(item.tongTieuThu)}</td>
                                <td className="px-6 py-4 text-right">{formatNumber(item.tongThanhTien)}</td>
                                <td className="px-6 py-4 text-right">{formatNumber(item.tongPhiVAT)}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-emerald-50/10 group-hover:bg-emerald-50/30">
                                  {formatNumber(item.tongTien)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                               <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                  Không tìm thấy dữ liệu phù hợp với bộ lọc
                               </td>
                            </tr>
                          )}
                        </tbody>
                        {filteredData.length > 0 && (
                          <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                             <tr>
                                <td className="px-6 py-4">TỔNG CỘNG</td>
                                <td className="px-6 py-4 text-right">{formatNumber(filteredData.reduce((a, b) => a + b.soLuongKhachHang, 0))}</td>
                                <td className="px-6 py-4 text-right">{formatNumber(filteredData.reduce((a, b) => a + b.tongTieuThu, 0))}</td>
                                <td className="px-6 py-4 text-right">{formatNumber(filteredData.reduce((a, b) => a + b.tongThanhTien, 0))}</td>
                                <td className="px-6 py-4 text-right">{formatNumber(filteredData.reduce((a, b) => a + b.tongPhiVAT, 0))}</td>
                                <td className="px-6 py-4 text-right text-emerald-700">{formatNumber(filteredData.reduce((a, b) => a + b.tongTien, 0))}</td>
                             </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 h-fit sticky top-24">
                      <div className="flex items-center space-x-2 text-emerald-600">
                        <MessageSquare size={22} />
                        <h3 className="font-bold text-lg">Phân Tích Bằng AI</h3>
                      </div>
                      <form onSubmit={handleAiAnalysis} className="space-y-4">
                        <textarea 
                           value={aiQuery}
                           onChange={(e) => setAiQuery(e.target.value)}
                           placeholder="VD: Đơn vị nào có số lượng khách hàng cao nhất nhưng tiêu thụ thấp nhất?"
                           className="w-full p-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all text-sm outline-none resize-none min-h-[120px] shadow-inner"
                        />
                        <button 
                           type="submit" 
                           disabled={isAiLoading || !aiQuery.trim() || filteredData.length === 0}
                           className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                         >
                           {isAiLoading ? <RefreshCw className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                           <span>Yêu Cầu AI Phân Tích</span>
                        </button>
                        {filteredData.length < aggregatedData.length && (
                          <p className="text-[10px] text-amber-600 font-bold text-center italic">AI sẽ phân tích dựa trên dữ liệu đã lọc ({filteredData.length} đơn vị).</p>
                        )}
                      </form>
                      {aiResponse && (
                        <div className="p-5 bg-emerald-50 rounded-xl text-sm text-slate-800 leading-relaxed max-h-[400px] overflow-y-auto border border-emerald-100 scrollbar-thin shadow-inner animate-in fade-in zoom-in duration-300">
                           <div className="prose prose-sm prose-emerald prose-p:mb-2 prose-headings:font-bold">
                              {aiResponse.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comparison Feature */}
        {activeTab === 'compare' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                   <h2 className="text-2xl font-bold text-slate-900">Theo Dõi Biến Động Khách Hàng</h2>
                   <p className="text-slate-500 mt-2">So sánh dữ liệu <span className="font-bold text-slate-700 italic">Tháng trước</span> và <span className="font-bold text-slate-700 italic">Tháng sau</span> dựa trên mã khách hàng.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700 px-1 uppercase tracking-wider">1. Kỳ dữ liệu Tháng trước</label>
                    <div className={`group p-8 border-2 border-dashed rounded-2xl transition-all h-48 flex flex-col items-center justify-center space-y-3 ${oldFile ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200 hover:border-amber-400 hover:bg-slate-50'}`}>
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setOldFile(e.target.files?.[0] || null)} className="hidden" id="old-file" />
                      <label htmlFor="old-file" className="cursor-pointer flex flex-col items-center space-y-3 w-full">
                        <Users className={oldFile ? "text-amber-500 animate-pulse" : "text-slate-400 group-hover:text-amber-500 transition-colors"} size={36} />
                        <span className="text-sm font-bold text-slate-700">{oldFile ? oldFile.name : 'Chọn File Tháng Trước'}</span>
                        {!oldFile && <span className="text-xs text-slate-400">Dùng làm gốc để tìm KH đã hủy</span>}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700 px-1 uppercase tracking-wider">2. Kỳ dữ liệu Tháng sau</label>
                    <div className={`group p-8 border-2 border-dashed rounded-2xl transition-all h-48 flex flex-col items-center justify-center space-y-3 ${newFile ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="hidden" id="new-file" />
                      <label htmlFor="new-file" className="cursor-pointer flex flex-col items-center space-y-3 w-full">
                        <UserPlus className={newFile ? "text-blue-500 animate-pulse" : "text-slate-400 group-hover:text-blue-500 transition-colors"} size={36} />
                        <span className="text-sm font-bold text-slate-700">{newFile ? newFile.name : 'Chọn File Tháng Sau'}</span>
                        {!newFile && <span className="text-xs text-slate-400">Dùng để tìm khách hàng lắp mới</span>}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <button 
                    onClick={handleComparison}
                    disabled={!oldFile || !newFile || status.status === 'processing'}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-xl shadow-emerald-200 flex items-center space-x-3 transition-all active:scale-95"
                  >
                    {status.status === 'processing' ? <RefreshCw className="animate-spin" size={24} /> : <ArrowRightLeft size={24} />}
                    <span className="text-lg">Bắt Đầu Phân Tích Biến Động</span>
                  </button>
                  {status.status === 'completed' && status.processedFiles === 2 && (
                    <div className="text-emerald-600 font-bold flex items-center space-x-2 animate-bounce">
                       <Info size={16} />
                       <span>Phân tích hoàn tất! Xem kết quả bên dưới.</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {comparisonResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-500">
                {/* New Customers */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shadow-blue-50">
                  <div className="p-6 border-b border-blue-100 bg-blue-50/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-blue-800">
                      <div className="bg-blue-600 p-1.5 rounded-lg">
                         <UserPlus className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">Khách Hàng Mới</h3>
                        <p className="text-xs text-blue-600 mt-1">Xuất hiện trong tháng sau nhưng không có trong tháng trước</p>
                      </div>
                    </div>
                    <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                      +{comparisonResult.newCustomers.length}
                    </span>
                  </div>
                  <div className="flex-grow max-h-[500px] overflow-y-auto scrollbar-thin">
                    {comparisonResult.newCustomers.length > 0 ? (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 sticky top-0 z-10 font-bold text-slate-600 shadow-sm">
                          <tr>
                            <th className="px-5 py-3 border-b border-slate-100">STT</th>
                            <th className="px-5 py-3 border-b border-slate-100">Mã KH</th>
                            <th className="px-5 py-3 border-b border-slate-100">Đơn vị</th>
                            <th className="px-5 py-3 border-b border-slate-100 text-right">Tiêu thụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparisonResult.newCustomers.map((c, i) => (
                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-5 py-3 text-slate-400 font-medium">{i + 1}</td>
                              <td className="px-5 py-3 font-mono font-bold text-blue-700">{c.maKhachHang}</td>
                              <td className="px-5 py-3 text-slate-600">{c.donVi || '-'}</td>
                              <td className="px-5 py-3 text-right font-semibold text-blue-600">{formatNumber(c.tieuThu || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-16 text-center text-slate-400 space-y-3">
                         <Info size={40} className="mx-auto opacity-20" />
                         <p className="text-sm font-medium">Không có khách hàng lắp mới trong kỳ này</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancelled Customers */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shadow-rose-50">
                  <div className="p-6 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-rose-800">
                      <div className="bg-rose-600 p-1.5 rounded-lg">
                        <UserMinus className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">Khách Hàng Hủy</h3>
                        <p className="text-xs text-rose-600 mt-1">Từng có trong tháng trước nhưng đã vắng mặt trong tháng sau</p>
                      </div>
                    </div>
                    <span className="bg-rose-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                      -{comparisonResult.cancelledCustomers.length}
                    </span>
                  </div>
                  <div className="flex-grow max-h-[500px] overflow-y-auto scrollbar-thin">
                    {comparisonResult.cancelledCustomers.length > 0 ? (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 sticky top-0 z-10 font-bold text-slate-600 shadow-sm">
                          <tr>
                            <th className="px-5 py-3 border-b border-slate-100">STT</th>
                            <th className="px-5 py-3 border-b border-slate-100">Mã KH</th>
                            <th className="px-5 py-3 border-b border-slate-100">Đơn vị</th>
                            <th className="px-5 py-3 border-b border-slate-100 text-right">Tiêu thụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparisonResult.cancelledCustomers.map((c, i) => (
                            <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                              <td className="px-5 py-3 text-slate-400 font-medium">{i + 1}</td>
                              <td className="px-5 py-3 font-mono font-bold text-rose-700">{c.maKhachHang}</td>
                              <td className="px-5 py-3 text-slate-600">{c.donVi || '-'}</td>
                              <td className="px-5 py-3 text-right font-semibold text-rose-600">{formatNumber(c.tieuThu || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-16 text-center text-slate-400 space-y-3">
                         <Info size={40} className="mx-auto opacity-20" />
                         <p className="text-sm font-medium">Không có khách hàng nào ngưng sử dụng trong kỳ này</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 text-slate-400 text-xs font-medium">
          <p>Utility Data Aggregator v1.0 &copy; 2024. Chuyên sâu phân tích dữ liệu hóa đơn.</p>
          <div className="flex items-center space-x-6">
             <span className="flex items-center space-x-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500"></div>
               <span className="uppercase tracking-wider">Gemini 3 Pro Active</span>
             </span>
             <span className="bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest text-[10px]">SheetJS v0.18.5</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
