export type PageId = "home" | "manuals" | "symptoms" | "kit" | "book" | "assistant";

export interface NavItem {
  id: PageId;
  label: string;
}
