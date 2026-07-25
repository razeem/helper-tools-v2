import { Injectable } from '@angular/core';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Generates real `.xlsx` workbooks entirely client-side (via exceljs) and
 * triggers a browser download. Fully offline; the output opens natively in
 * Excel, Numbers, and Google Sheets. exceljs is dynamically imported so it
 * stays out of the initial bundle and only loads on first export.
 */
@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  async export(fileName: string, sheets: ExcelSheet[]): Promise<Blob> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    workbook.creator = 'Helper Tools';
    workbook.created = new Date();

    for (const sheet of sheets) {
      const ws = workbook.addWorksheet(sheet.name);
      ws.columns = sheet.columns.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width ?? 28,
      }));
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle' };
      for (const row of sheet.rows) {
        ws.addRow(row);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: XLSX_MIME });
    downloadBlob(blob, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
    return blob;
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
