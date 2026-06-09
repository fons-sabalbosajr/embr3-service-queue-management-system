/**
 * exportData.js — Pure-JS data export helpers (no external libraries).
 *
 * exportToCSV(exportCols, data, filename)
 * exportToExcel(exportCols, data, filename)
 *
 * exportCols: Array of { title, dataIndex, exportValue? (val, record) => string }
 * data:       Array of plain record objects
 * filename:   string without extension (default 'export')
 */

function resolveCell(col, record) {
  const raw = col.dataIndex ? record[col.dataIndex] : undefined;
  if (typeof col.exportValue === 'function') return col.exportValue(raw, record);
  return raw;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Exports data as a UTF-8 CSV file (Excel-compatible). */
export function exportToCSV(exportCols, data, filename = 'export') {
  const headers = exportCols.map((c) => `"${String(c.title ?? '').replace(/"/g, '""')}"`);
  const rows = data.map((rec) =>
    exportCols.map((c) => `"${String(resolveCell(c, rec) ?? '').replace(/"/g, '""')}"`)
  );
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  // UTF-8 BOM ensures Excel opens with correct encoding
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

/** Exports data as a SpreadsheetML (.xls) file readable by Excel / Calc. */
export function exportToExcel(exportCols, data, filename = 'export') {
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headerCells = exportCols
    .map(
      (c) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${esc(c.title ?? '')}</Data></Cell>`
    )
    .join('');

  const dataRows = data
    .map(
      (rec) =>
        `<Row>${exportCols
          .map(
            (c) =>
              `<Cell><Data ss:Type="String">${esc(resolveCell(c, rec))}</Data></Cell>`
          )
          .join('')}</Row>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Data">
    <Table>
      <Row>${headerCells}</Row>
${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${filename}.xls`);
}
