import { Injectable } from '@angular/core';
import type { Workbook } from 'exceljs';

interface ExcelJsModule {
  Workbook: new () => Workbook;
}

/**
 * exceljs is CommonJS; depending on the bundler's interop its constructor is
 * exposed either as a named export (dev) or under `.default` (prod/minified).
 * Normalize both so `new Workbook()` works in every build.
 */
async function loadExcelJs(): Promise<ExcelJsModule> {
  const mod = (await import('exceljs')) as unknown as ExcelJsModule & {
    default?: ExcelJsModule;
  };
  return mod.default ?? mod;
}

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

/** One titled table; several stack vertically inside a single worksheet tab. */
export interface ExcelBlock {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}

/** A worksheet composed of several stacked tables (keeps the tab count low). */
export interface ComposedSheet {
  name: string;
  blocks: ExcelBlock[];
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
    const { Workbook } = await loadExcelJs();
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

  /**
   * Write worksheets that each stack several titled tables (with a spacer row
   * between them). Lets many small sections share one tab instead of exploding
   * into a tab each.
   */
  async exportComposed(fileName: string, sheets: ComposedSheet[]): Promise<Blob> {
    const { Workbook } = await loadExcelJs();
    const workbook = new Workbook();
    workbook.creator = 'Helper Tools';
    workbook.created = new Date();

    for (const sheet of sheets) {
      const ws = workbook.addWorksheet(sheet.name);
      let maxCols = 1;
      for (const block of sheet.blocks) {
        maxCols = Math.max(maxCols, block.headers.length);
        if (block.title) {
          const titleRow = ws.addRow([block.title]);
          titleRow.font = { bold: true, size: 13 };
        }
        const headerRow = ws.addRow(block.headers);
        headerRow.font = { bold: true };
        headerRow.alignment = { vertical: 'middle' };
        for (const row of block.rows) {
          ws.addRow(row);
        }
        ws.addRow([]); // spacer between blocks
      }
      ws.getColumn(1).width = 32;
      for (let c = 2; c <= maxCols; c++) {
        ws.getColumn(c).width = 20;
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
