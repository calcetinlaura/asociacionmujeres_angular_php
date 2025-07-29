export interface ColumnModel {
  title: string;
  key: string;
  sortable?: boolean;
  showIndicatorOnEmpty?: boolean;
  booleanIndicator?: boolean;
  minWidth?: boolean;
  mediumWidth?: boolean;
  largeWidth?: boolean;
  width?: ColumnWidth;
  pipe?: string;
  showLengthOnly?: boolean;
  footerTotal?: boolean;
}
export enum ColumnWidth {
  XS = 'w-[90px]',
  SM = 'w-[120px]',
  MD = 'w-[160px]',
  LG = 'w-[200px]',
  XL = 'w-[240px]',
  FULL = 'w-full',
}
