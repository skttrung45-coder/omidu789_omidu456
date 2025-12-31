
import * as XLSX from 'xlsx';
import { RawRow, AggregatedData, ComparisonResult } from '../types';

/**
 * Reads an Excel file and converts it to JSON.
 */
export const readFile = (file: File): Promise<RawRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<RawRow>(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Aggregates data from multiple files based on the 'donVi' column.
 */
export const processExcelFiles = async (files: File[]): Promise<AggregatedData[]> => {
  const allData: RawRow[] = [];

  for (const file of files) {
    const data = await readFile(file);
    allData.push(...data);
  }

  const grouped = allData.reduce((acc, curr) => {
    const key = curr.donVi || 'Khác';
    if (!acc[key]) {
      acc[key] = {
        donVi: key,
        countMaKH: 0,
        tongTieuThu: 0,
        tongThanhTien: 0,
        tongPhiVAT: 0,
        tongPhiBVMT: 0,
        tongPhiDuyTriDauNoi: 0,
        tongTien: 0,
      };
    }

    const group = acc[key];
    if (curr.maKhachHang !== undefined) {
      group.countMaKH += 1; // Count of rows for this maKhachHang column
    }
    
    group.tongTieuThu += Number(curr.tieuThu || 0);
    group.tongThanhTien += Number(curr.thanhTien || 0);
    group.tongPhiVAT += Number(curr.phiVAT || 0);
    group.tongPhiBVMT += Number(curr.phiBVMT || 0);
    group.tongPhiDuyTriDauNoi += Number(curr.phiDuyTriDauNoi || 0);
    group.tongTien += Number(curr.tongTien || 0);

    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).map((group: any) => ({
    donVi: group.donVi,
    soLuongKhachHang: group.countMaKH,
    tongTieuThu: group.tongTieuThu,
    tongThanhTien: group.tongThanhTien,
    tongPhiVAT: group.tongPhiVAT,
    tongPhiBVMT: group.tongPhiBVMT,
    tongPhiDuyTriDauNoi: group.tongPhiDuyTriDauNoi,
    tongTien: group.tongTien,
  }));
};

/**
 * Compares two files to find new and cancelled customers based on maKhachHang.
 */
export const compareCustomerData = async (oldFile: File, newFile: File): Promise<ComparisonResult> => {
  const oldData = await readFile(oldFile);
  const newData = await readFile(newFile);

  const oldMap = new Map<string | number, RawRow>();
  oldData.forEach(row => {
    if (row.maKhachHang) oldMap.set(row.maKhachHang, row);
  });

  const newMap = new Map<string | number, RawRow>();
  newData.forEach(row => {
    if (row.maKhachHang) newMap.set(row.maKhachHang, row);
  });

  const newCustomers: RawRow[] = [];
  newData.forEach(row => {
    if (row.maKhachHang && !oldMap.has(row.maKhachHang)) {
      newCustomers.push(row);
    }
  });

  const cancelledCustomers: RawRow[] = [];
  oldData.forEach(row => {
    if (row.maKhachHang && !newMap.has(row.maKhachHang)) {
      cancelledCustomers.push(row);
    }
  });

  return {
    newCustomers,
    cancelledCustomers,
    oldFileCount: oldData.length,
    newFileCount: newData.length
  };
};

export const exportToExcel = (data: any[], fileName: string = 'export.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, fileName);
};
