'use client';
// List in the style of the current DataTables screens: row check boxes, sortable grey header,
// "Show [50] Entries", "Search:", "Showing 1 to N of N Entries" and Previous / page / Next.
import { SearchOutlined } from '@ant-design/icons';
import { App, Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

interface Props<T> {
  rows: T[];
  columns: ColumnsType<T>;
  rowKey: keyof T & string;
  loading?: boolean;
  searchText: (row: T) => string;
  emptyText: string;
}

/** Sorter for a column, compared as text or number like DataTables does. */
export function by<T>(value: (row: T) => string | number | null | undefined) {
  return (a: T, b: T) => {
    const x = value(a) ?? '';
    const y = value(b) ?? '';
    return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
  };
}

/** Right-hand tool bar of the current list pages: search panel, Select / Update, Active / Inactive. */
export function ListToolbar() {
  const { message } = App.useApp();
  const notInDemo = () => message.info('Bulk status update and advanced search are not part of this demo.');
  return (
    <div className="jg-toolbar">
      <Button className="jg-btn" icon={<SearchOutlined />} aria-label="Advanced search" onClick={notInDemo} />
      <select aria-label="Bulk action" defaultValue="">
        <option value="" disabled>Select</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <Button className="jg-btn" onClick={notInDemo}>Update</Button>
      <span className="jg-toolbar-sep" />
      <Button className="jg-btn" onClick={notInDemo}>Active</Button>
      <Button className="jg-btn" onClick={notInDemo}>Inactive</Button>
    </div>
  );
}

export function DataList<T extends object>({ rows, columns, rowKey, loading, searchText, emptyText }: Props<T>) {
  const [size, setSize] = useState(50);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<React.Key[]>([]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? rows.filter((r) => searchText(r).toLowerCase().includes(term)) : rows;
  }, [rows, q, searchText]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const from = filtered.length ? (current - 1) * size + 1 : 0;
  const to = Math.min(current * size, filtered.length);

  return (
    <>
      <div className="jg-dt-bar">
        <label>
          Show
          <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} aria-label="Entries per page">
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          Entries
        </label>
        <label>
          Search:
          <input value={q} placeholder="Free Text" onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </label>
      </div>
      <Table<T>
        className="jg-table"
        rowKey={rowKey}
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected, columnWidth: 36 }}
        pagination={{ current, pageSize: size, style: { display: 'none' } }}
        showSorterTooltip={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText }}
      />
      <div className="jg-dt-foot">
        <span>Showing {from} to {to} of {filtered.length} Entries</span>
        <span>
          <Button type="text" size="small" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</Button>
          <span className="jg-dt-page">{current}</span>
          <Button type="text" size="small" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</Button>
        </span>
      </div>
    </>
  );
}
