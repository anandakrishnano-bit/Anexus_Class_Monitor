import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import * as XLSX from 'xlsx';

export interface ExportFileOptions {
  filename: string;
  data: string; // base64 string or plain text
  mimeType: string;
  isBase64?: boolean;
}

/**
 * Universal file exporter that works on Android (Capacitor native filesystem + share sheet)
 * and falls back to standard browser downloads on Web.
 */
export async function exportFile(options: ExportFileOptions): Promise<boolean> {
  const { filename, data, mimeType, isBase64 = false } = options;

  // On Native Android / iOS via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Write file to device cache directory
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: data,
        directory: Directory.Cache,
        encoding: isBase64 ? undefined : Encoding.UTF8
      });

      // 2. Open Android native share sheet to let user Save to Downloads / Drive / WhatsApp / Excel
      await Share.share({
        title: filename,
        text: `Exported ${filename}`,
        url: writeResult.uri,
        dialogTitle: `Save or Share ${filename}`
      });

      return true;
    } catch (nativeErr) {
      console.warn('Native Capacitor share failed, attempting browser fallback:', nativeErr);
    }
  }

  // Web browser download fallback
  try {
    let blob: Blob;
    if (isBase64) {
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (webErr) {
    console.error('Browser export failed:', webErr);
    throw webErr;
  }
}

/**
 * Exports an XLSX workbook cleanly on both Android native and Web
 */
export async function exportXlsxWorkbook(workbook: XLSX.WorkBook, filename: string): Promise<boolean> {
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  return exportFile({
    filename: cleanFilename,
    data: base64Data,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isBase64: true
  });
}

/**
 * Exports a CSV string cleanly on both Android native and Web
 */
export async function exportCsvFile(csvContent: string, filename: string): Promise<boolean> {
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  return exportFile({
    filename: cleanFilename,
    data: csvContent,
    mimeType: 'text/csv',
    isBase64: false
  });
}

/**
 * Exports a JSON string cleanly on both Android native and Web
 */
export async function exportJsonFile(jsonContent: string, filename: string): Promise<boolean> {
  const cleanFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  return exportFile({
    filename: cleanFilename,
    data: jsonContent,
    mimeType: 'application/json',
    isBase64: false
  });
}
