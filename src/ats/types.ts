export type AtsKind =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "personio"
  | "other";

export interface Company {
  name: string;
  country: string;
  website: string;
  careersUrl: string | null;
  ats: AtsKind;
  slug: string | null;
}

export interface Job {
  company: string;
  licenceCountry: string;
  title: string;
  location: string;
  remote: boolean;
  department: string;
  url: string;
  postedAt: string | null;
}

export interface FirmRow {
  name: string;
  country: string;
  website: string;
}
