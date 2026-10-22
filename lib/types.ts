export const ATS_VALUES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "personio",
  "teamtailor",
  "recruitee",
  "smartrecruiters",
  "other",
  "none_found",
] as const;

export type Ats = (typeof ATS_VALUES)[number];

export type CompanyStatus = "ok" | "none_found" | "error";

export type Company = {
  name: string;
  licenceCountry: string;
  website: string | null;
  careersUrl: string | null;
  ats: Ats;
  slug: string | null;
  status: CompanyStatus;
};

export const DEPARTMENTS = [
  "Compliance & Legal",
  "Data",
  "Engineering",
  "Product",
  "Content",
  "Marketing & Growth",
  "Sales & BD",
  "Finance",
  "Operations",
  "Other",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export type Job = {
  id: string;
  company: string;
  licenceCountry: string;
  title: string;
  location: string;
  remote: boolean;
  department: Department;
  url: string;
  postedAt: string | null;
  fetchedAt: string;
};

export type FetchFailure = {
  company: string;
  ats: string;
  reason: string;
};
