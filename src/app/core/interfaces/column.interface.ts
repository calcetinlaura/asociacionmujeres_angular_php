export interface ColumnModel {
  title: string;
  key: string;
  sortable?: boolean;
  showIndicatorOnEmpty?: boolean;
  booleanIndicator?: boolean;
  minWidth?: boolean;
  pipe?: string;
  showLengthOnly?: boolean;
  footerTotal?: boolean;
}
