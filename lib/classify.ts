import { DEPARTMENTS, type Department } from "./types";

const DEPARTMENT_RULES: Array<{ department: Department; pattern: RegExp }> = [
  {
    department: "Compliance & Legal",
    pattern:
      /\b(compliance|aml|kyc|kyb|regulatory|regulation|legal|counsel|lawyer|attorney|sanctions|mlro|mica|dora|financial crime)\b/i,
  },
  {
    department: "Data",
    pattern:
      /\b(data scientist|data science|data engineer|data analyst|analytics|machine learning|business intelligence|ml engineer|\bai\b)\b/i,
  },
  {
    department: "Engineering",
    pattern:
      /\b(engineer|developer|devops|sre|frontend|front-end|backend|back-end|fullstack|full-stack|software|infrastructure|platform|ios|android|security engineer|site reliability)\b/i,
  },
  {
    department: "Product",
    pattern: /\b(product manager|product owner|product designer|product)\b/i,
  },
  {
    department: "Content",
    pattern: /\b(content|copywriter|copywriting|editor|editorial|journalist)\b/i,
  },
  {
    department: "Marketing & Growth",
    pattern: /\b(marketing|growth|brand|community|communications|social media|seo)\b/i,
  },
  {
    department: "Sales & BD",
    pattern:
      /\b(sales|business development|partnerships?|account executive|account manager|\bbd\b)\b/i,
  },
  {
    department: "Finance",
    pattern: /\b(finance|accountant|accounting|controller|treasury|cfo|audit|fp&a)\b/i,
  },
  {
    department: "Operations",
    pattern:
      /\b(operations|ops|office manager|people|human resources|\bhr\b|talent|recruiter|recruiting|customer support|customer success|\bsupport\b)\b/i,
  },
];

export function postedWithin(postedAt: string | null, days: number, now = Date.now()): boolean {
  if (!Number.isFinite(days) || days <= 0) return true;
  if (!postedAt) return false;
  const time = new Date(postedAt).getTime();
  if (Number.isNaN(time)) return false;
  return now - time <= days * 24 * 60 * 60 * 1000;
}

export function classifyDepartment(title: string): Department {
  for (const rule of DEPARTMENT_RULES) {
    if (rule.pattern.test(title)) return rule.department;
  }
  return "Other";
}

const REMOTE_PATTERN =
  /\b(remote|anywhere|eu-remote|eu remote|europe[- ]remote|work from home|work-from-home|\bwfh\b)\b/i;

const EU_COUNTRY_PATTERN =
  /\b(austria|belgium|bulgaria|croatia|cyprus|czechia|czech republic|denmark|estonia|finland|france|germany|greece|hungary|ireland|italy|latvia|lithuania|luxembourg|malta|netherlands|holland|poland|portugal|romania|slovakia|slovenia|spain|sweden|iceland|liechtenstein|norway|deutschland|österreich|osterreich|frankreich|spanien|italien|niederlande|polen|schweden|dänemark|danemark|finnland|belgien|irland|griechenland|tschechien|ungarn|rumänien|rumanien|estland|lettland|litauen|slowakei|slowenien|kroatien|bulgarien|zypern|norwegen|allemagne|espagne|pays-bas|belgique|irlande|autriche|pologne|suède|suede|danemark|finlande|grèce|grece|république tchèque|hongrie|roumanie|estonie|lettonie|lituanie|slovaquie|slovénie|slovenie|croatie|bulgarie|chypre|islande|norvège|norvege)\b/i;

const EU_CITY_PATTERN =
  /\b(berlin|munich|münchen|munchen|frankfurt|hamburg|cologne|köln|koln|düsseldorf|dusseldorf|stuttgart|paris|lyon|marseille|amsterdam|rotterdam|the hague|den haag|dublin|cork|lisbon|lisboa|porto|madrid|barcelona|valencia|milan|milano|rome|roma|vienna|wien|warsaw|warszawa|krakow|kraków|prague|praha|stockholm|copenhagen|köpenhamn|kopenhagen|helsinki|brussels|bruxelles|brussel|luxembourg|tallinn|vilnius|riga|athens|athen|bucharest|bucuresti|budapest|bratislava|ljubljana|zagreb|valletta|nicosia|reykjavik|oslo|gothenburg|göteborg|malmö|malmo|antwerp|antwerpen|ghent|gent|eindhoven|utrecht|leuven|salzburg|graz|linz|innsbruck|nantes|toulouse|lille|bordeaux|turin|torino|naples|napoli|florence|firenze|bologna|bilbao|seville|sevilla|malaga|málaga|brno|gdansk|gdańsk|wroclaw|wrocław|poznan|poznań|sofia|thessaloniki|limassol|kaunas|tartu|bergen|trondheim)\b/i;

const EU_WORD_PATTERN = /\b(eu|eea|european union|eu\/eea)\b/i;
const EUROPE_PATTERN = /\b(europe|european|emea)\b/i;

const US_PATTERN =
  /\b(united states|u\.s\.a\.|usa|u\.s\.|us only|north america|new york|nyc|san francisco|los angeles|chicago|boston|seattle|austin|miami|denver|atlanta|washington,? d\.c\.?|bay area|california|texas)\b/i;

const APAC_PATTERN =
  /\b(apac|asia pacific|asia|singapore|hong kong|australia|india|japan|china|korea|seoul|tokyo|sydney|melbourne|bangalore|bengaluru|mumbai|dubai|uae|united arab emirates|new zealand|taiwan|indonesia|vietnam|philippines|thailand|malaysia|bangkok)\b/i;

const NON_EU_PATTERN =
  /\b(ukraine|kyiv|kiev|brazil|brasil|canada|switzerland|swiss|serbia|turkey|türkiye|mexico|argentina|chile|colombia|south africa|nigeria|israel|egypt|morocco|kenya)\b|,\s*CH\b/i;

const UK_PATTERN =
  /\b(united kingdom|uk only|england|scotland|wales|london|manchester|edinburgh|birmingham|bristol|cambridge|oxford)\b/i;

export function isRemote(title: string, location: string): boolean {
  return REMOTE_PATTERN.test(`${title}\n${location}`);
}

export function locatedInEu(location: string): boolean {
  return EU_COUNTRY_PATTERN.test(location) || EU_CITY_PATTERN.test(location) || EU_WORD_PATTERN.test(location);
}

export function keepJob(title: string, location: string, remoteHint = false): { remote: boolean; keep: boolean } {
  const combined = `${title}\n${location}`;
  const remote = isRemote(title, location) || remoteHint;
  const member = locatedInEu(location);
  const nonEuCountry = NON_EU_PATTERN.test(location);
  const blockedRegion =
    US_PATTERN.test(combined) || APAC_PATTERN.test(combined) || UK_PATTERN.test(combined) || nonEuCountry;
  const openToEu = EU_WORD_PATTERN.test(combined) || EUROPE_PATTERN.test(combined);

  if (member && !nonEuCountry) return { remote, keep: true };
  if (nonEuCountry && !EU_WORD_PATTERN.test(location)) return { remote, keep: false };
  if (blockedRegion && !openToEu) return { remote, keep: false };
  if (remote || openToEu || member) return { remote, keep: true };
  return { remote, keep: false };
}

export function departmentsInOrder(): readonly Department[] {
  return DEPARTMENTS;
}
