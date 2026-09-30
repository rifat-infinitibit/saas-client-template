import {
	Pagination,
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableHeaderCell,
	TableRow,
} from '@infinitibit_gmbh/ui';
import {
	type ColumnDef,
	type RowData,
	metaHelper,
	tableFeatures,
	useTable,
} from '@tanstack/react-table';

import { m } from '@/paraglide/messages';

interface ColumnMeta {
	/** Numbers and dates: on the end edge, and never broken across lines. */
	align?: 'end';
}

/** What every DataTable's columns are declared against, for `createColumnHelper`. */
export const dataTableFeatures = tableFeatures({
	columnMeta: metaHelper<ColumnMeta>(),
});

type Columns<Row extends RowData> = ColumnDef<typeof dataTableFeatures, Row>[];

/**
 * The one list table: a page the Service already cut, drawn with the design
 * system's table and pagination. It never sorts, filters or pages rows itself.
 */
export function DataTable<Row extends RowData>({
	columns,
	rows,
	page,
	pageCount,
	onPageChange,
	rowActions,
	empty,
}: {
	columns: Columns<Row>;
	rows: Row[];
	/** 1-based, as the Service counts. */
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
	/** Drawn in a trailing column, so every list puts them in the same place. */
	rowActions?: (row: Row) => React.ReactNode;
	empty: string;
}) {
	const table = useTable({ features: dataTableFeatures, columns, data: rows });
	const width = columns.length + (rowActions ? 1 : 0);

	return (
		<div className="flex flex-col items-end gap-4">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((group) => (
						<TableRow key={group.id}>
							{group.headers.map((header) => (
								<TableHeaderCell
									className={alignment(header.column.columnDef.meta)}
									key={header.id}
								>
									{header.isPlaceholder ? null : (
										<table.FlexRender header={header} />
									)}
								</TableHeaderCell>
							))}
							{rowActions ? (
								<TableHeaderCell>
									<span className="sr-only">{m.data_table_actions()}</span>
								</TableHeaderCell>
							) : null}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={width}>{empty}</TableCell>
						</TableRow>
					) : (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getAllCells().map((cell) => (
									<TableCell
										className={alignment(cell.column.columnDef.meta)}
										key={cell.id}
									>
										<table.FlexRender cell={cell} />
									</TableCell>
								))}
								{rowActions ? (
									<TableCell className="text-end whitespace-nowrap">
										{rowActions(row.original)}
									</TableCell>
								) : null}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
			{pageCount > 1 ? (
				<Pagination
					label={m.data_table_pages()}
					onPageChange={onPageChange}
					page={page}
					totalPages={pageCount}
				/>
			) : null}
		</div>
	);
}

function alignment(meta: ColumnMeta | undefined) {
	return meta?.align === 'end' ? 'text-end whitespace-nowrap' : undefined;
}
