
export interface RawRow {
  donVi: string;
  maKhachHang: string | number;
  tieuThu: number;
  thanhTien: number;
  phiVAT: number;
  phiBVMT: number;
  phiDuyTriDauNoi: number;
  tongTien: number;
  tenKhachHang?: string;
  diaChi?: string;
  [key: string]: any;
}

export interface AggregatedData {
  donVi: string;
  soLuongKhachHang: number;
  tongTieuThu: number;
  tongThanhTien: number;
  tongPhiVAT: number;
  tongPhiBVMT: number;
  tongPhiDuyTriDauNoi: number;
  tongTien: number;
}

export interface ComparisonResult {
  newCustomers: RawRow[];
  cancelledCustomers: RawRow[];
  oldFileCount: number;
  newFileCount: number;
}

export interface ProcessingStatus {
  totalFiles: number;
  processedFiles: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  message: string;
}
