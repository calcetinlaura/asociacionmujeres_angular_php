export interface ColumnModel {
  title: string;
  key: string;
  sortable?: boolean;
  showIndicatorOnEmpty?: boolean;
  booleanIndicator?: boolean;
  width?: ColumnWidth;
  pipe?: string;
  pipeArg?: string;
  showLengthOnly?: boolean;
  footerTotal?: boolean;
  backColor?: boolean;
  textAlign?: 'right' | 'left' | 'center';
}
export enum ColumnWidth {
  XS = 'w-[90px]',
  SM = 'w-[120px]',
  MD = 'w-[160px]',
  LG = 'w-[200px]',
  XL = 'w-[240px]',
  FULL = 'w-full',
}
