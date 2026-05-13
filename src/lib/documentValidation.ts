export type DocumentValidationResult = {
  ok: boolean;
  /** Normalized value (cleaned of separators when safe to canonicalize). */
  normalized?: string;
  /** Localized error message in Spanish. */
  error?: string;
};

/* ════════════════════════════════════════════════════════════════════════
   Algorithm helpers — checksum implementations referenced by per-country
   national ID rules below. All take a digit-only string and return bool.
   ═══════════════════════════════════════════════════════════════════════ */

/** Standard Luhn / mod-10 used by Canada SIN, Israel TZ, S. Africa ID, etc. */
function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Verhoeff checksum (Aadhaar / India). */
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
function verhoeff(digits: string): boolean {
  let c = 0;
  const rev = digits.split("").reverse();
  for (let i = 0; i < rev.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(rev[i])]];
  }
  return c === 0;
}

/** DGII Dominican cédula algorithm (Luhn-like on first 10 digits). */
function dgiiCedulaChecksum(digits10: string): number {
  const mult = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let product = Number(digits10[i]) * mult[i];
    if (product >= 10) product -= 9;
    sum += product;
  }
  return (10 - (sum % 10)) % 10;
}

/** Spain DNI/NIE checksum letter (mod 23). */
const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
function spainDniLetter(numericPart: number): string {
  return DNI_LETTERS[numericPart % 23];
}

/** Chile RUT verifier (mod 11). */
function chileRutDigit(num: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += Number(num[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}

/** Brazil CPF checksum (two digits, mod 11). */
function brazilCpfValid(digits11: string): boolean {
  if (/^(\d)\1{10}$/.test(digits11)) return false; // reject 11111111111 etc.
  const check = (slice: string, start: number) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += Number(slice[i]) * (start - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(digits11.slice(0, 9), 10) === Number(digits11[9])
      && check(digits11.slice(0, 10), 11) === Number(digits11[10]);
}

/** Mexico CURP checksum (last char). */
function mexicoCurpValid(curp: string): boolean {
  if (!/^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp)) return false;
  const dict = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += dict.indexOf(curp[i]) * (18 - i);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(curp[17]);
}

/** Italy Codice Fiscale (16 chars, mod-26). */
function italyCfValid(cf: string): boolean {
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf)) return false;
  const oddMap: Record<string, number> = {};
  const evenMap: Record<string, number> = {};
  const odd = "BAKPLCQDREVOSFTGUHMINJWZYX";
  for (let i = 0; i < 26; i++) {
    oddMap[String.fromCharCode(65 + i)] = odd.charCodeAt(i) - 65;
    if (i < 10) {
      oddMap[String(i)] = "ABCDEFGHIJ".indexOf(odd[i]);
      evenMap[String(i)] = i;
    }
    evenMap[String.fromCharCode(65 + i)] = i;
  }
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += (i % 2 === 0 ? oddMap : evenMap)[cf[i]];
  return String.fromCharCode(65 + (sum % 26)) === cf[15];
}

/** Poland PESEL (weighted, mod 10). */
function peselValid(d: string): boolean {
  if (d.length !== 11) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * w[i];
  return (10 - (sum % 10)) % 10 === Number(d[10]);
}

/** Sweden Personnummer (10 digits, Luhn). */
function swedenPnrValid(d: string): boolean {
  return d.length === 10 && luhn(d);
}

/** Norway Fødselsnummer (11 digits, two mod-11 check digits). */
function norwayFnrValid(d: string): boolean {
  if (d.length !== 11) return false;
  const w1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const w2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let s1 = 0; for (let i = 0; i < 9; i++) s1 += Number(d[i]) * w1[i];
  const c1 = (11 - (s1 % 11)) % 11; if (c1 === 10) return false;
  if (c1 !== Number(d[9])) return false;
  let s2 = 0; for (let i = 0; i < 10; i++) s2 += Number(d[i]) * w2[i];
  const c2 = (11 - (s2 % 11)) % 11; if (c2 === 10) return false;
  return c2 === Number(d[10]);
}

/** Denmark CPR (10 digits, mod-11 — abandoned 2007, accept if mod-11 OR format). */
function denmarkCprValid(d: string): boolean {
  if (!/^\d{10}$/.test(d)) return false;
  const w = [4, 3, 2, 7, 6, 5, 4, 3, 2, 1];
  let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * w[i];
  return s % 11 === 0 || true; // post-2007 CPRs may not satisfy mod-11
}

/** China RID 18-char (ISO 7064 mod 11-2). */
function chinaRidValid(id: string): boolean {
  if (!/^\d{17}[\dX]$/.test(id)) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const check = "10X98765432";
  let s = 0; for (let i = 0; i < 17; i++) s += Number(id[i]) * w[i];
  return check[s % 11] === id[17].toUpperCase();
}

/** Turkey TC Kimlik (11 digits, two check digits). */
function turkeyTcValid(d: string): boolean {
  if (!/^[1-9]\d{10}$/.test(d)) return false;
  let oddSum = 0, evenSum = 0;
  for (let i = 0; i < 9; i++) (i % 2 === 0 ? (oddSum += +d[i]) : (evenSum += +d[i]));
  if ((oddSum * 7 - evenSum) % 10 !== +d[9]) return false;
  let sum10 = 0; for (let i = 0; i < 10; i++) sum10 += +d[i];
  return sum10 % 10 === +d[10];
}

/** Korea RRN (13 digits, weighted mod 11). */
function koreaRrnValid(d: string): boolean {
  if (!/^\d{13}$/.test(d)) return false;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let s = 0; for (let i = 0; i < 12; i++) s += Number(d[i]) * w[i];
  return (11 - (s % 11)) % 10 === Number(d[12]);
}

/** Israel Teudat Zehut (9 digits, Luhn variant). */
function israelTzValid(d: string): boolean {
  if (d.length !== 9 || !/^\d+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(d[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

/** Belgium National Register (11 digits, mod 97). */
function belgiumNrnValid(d: string): boolean {
  if (!/^\d{11}$/.test(d)) return false;
  const base = Number(d.slice(0, 9));
  const check = Number(d.slice(9));
  const v1 = 97 - (base % 97);
  const v2 = 97 - ((2_000_000_000 + base) % 97);
  return v1 === check || v2 === check;
}

/** France NIR / INSEE (15 digits, mod 97). */
function franceNirValid(d: string): boolean {
  if (!/^[12]\d{14}$/.test(d)) return false;
  const base = d.slice(0, 13).replace(/2A/i, "19").replace(/2B/i, "18");
  const check = Number(d.slice(13));
  return 97 - (Number(base) % 97) === check;
}

/** Netherlands BSN (8–9 digits, 11-test). */
function netherlandsBsnValid(d: string): boolean {
  if (!/^\d{8,9}$/.test(d)) return false;
  const padded = d.padStart(9, "0");
  const w = [9, 8, 7, 6, 5, 4, 3, 2, -1];
  let s = 0; for (let i = 0; i < 9; i++) s += Number(padded[i]) * w[i];
  return s % 11 === 0;
}

/** Portugal NIF (9 digits, mod 11). */
function portugalNifValid(d: string): boolean {
  if (!/^\d{9}$/.test(d)) return false;
  const w = [9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0; for (let i = 0; i < 8; i++) s += Number(d[i]) * w[i];
  const r = 11 - (s % 11);
  const check = r > 9 ? 0 : r;
  return check === Number(d[8]);
}

/** Finland HETU (11 chars). */
function finlandHetuValid(s: string): boolean {
  const re = /^(\d{6})([-+ABCDEFYXWVU])(\d{3})([0-9A-Y])$/i;
  const m = re.exec(s.toUpperCase());
  if (!m) return false;
  const num = Number(m[1] + m[3]);
  const checkChars = "0123456789ABCDEFHJKLMNPRSTUVWXY";
  return checkChars[num % 31] === m[4];
}

/** Czech / Slovak rodné číslo (9–10 digits, mod 11 for post-1954). */
function czRcValid(d: string): boolean {
  if (!/^\d{9,10}$/.test(d)) return false;
  if (d.length === 10) return Number(d) % 11 === 0 || Number(d) % 11 === 10;
  return true; // pre-1954: format-only
}

/** El Salvador DUI (9 digits, mod 10). */
function svDuiValid(d: string): boolean {
  if (!/^\d{9}$/.test(d)) return false;
  let s = 0; for (let i = 0; i < 8; i++) s += Number(d[i]) * (9 - i);
  return (10 - (s % 10)) % 10 === Number(d[8]);
}

/** Ecuador Cédula (10 digits, mod 10 weighted). */
function ecuadorCedulaValid(d: string): boolean {
  if (!/^\d{10}$/.test(d)) return false;
  const prov = Number(d.slice(0, 2));
  if (prov < 1 || prov > 24) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(d[i]) * (i % 2 === 0 ? 2 : 1);
    if (n > 9) n -= 9;
    s += n;
  }
  return (10 - (s % 10)) % 10 === Number(d[9]);
}

/** Uruguay CI (8 digits, mod-10 weighted). */
function uruguayCiValid(d: string): boolean {
  if (!/^\d{7,8}$/.test(d)) return false;
  const padded = d.padStart(8, "0");
  const w = [2, 9, 8, 7, 6, 3, 4];
  let s = 0; for (let i = 0; i < 7; i++) s += Number(padded[i]) * w[i];
  return (10 - (s % 10)) % 10 === Number(padded[7]);
}

/* ════════════════════════════════════════════════════════════════════════
   National ID + Passport rules per country
   ═══════════════════════════════════════════════════════════════════════ */

export interface IdRule {
  /** Algorithm label shown in UI (e.g. "DGII Luhn", "Verhoeff"). */
  name: string;
  /** Example format for placeholder. */
  example: string;
  /** Returns ok/error result. Receives raw (post-format) input. */
  validate: (raw: string) => DocumentValidationResult;
  /** Optional live formatter (applied on every keystroke). */
  format?: (raw: string) => string;
}

export interface PassportRule {
  regex: RegExp;
  example: string;
}

export interface CountryEntry {
  code: string;
  flag: string;
  nameEs: string;
  nameEn: string;
  nationalityEs: string;
  /** National-ID rule, when the country has a strict algorithm. */
  nationalId?: IdRule;
  passport?: PassportRule;
}

/* Helpers used by builders below. */
const onlyDigits = (s: string) => s.replace(/\D+/g, "");
const upper = (s: string) => s.toUpperCase().replace(/\s+/g, "");

function lengthRule(opts: {
  name: string;
  example: string;
  min: number;
  max: number;
  digitsOnly?: boolean;
  format?: (raw: string) => string;
}): IdRule {
  return {
    name: opts.name,
    example: opts.example,
    format: opts.format ?? (opts.digitsOnly ? onlyDigits : (s) => s),
    validate(raw) {
      const v = opts.digitsOnly ? onlyDigits(raw) : raw.trim();
      if (!v) return { ok: false, error: `${opts.name} requerido.` };
      if (v.length < opts.min || v.length > opts.max)
        return { ok: false, error: `${opts.name} debe tener ${opts.min === opts.max ? `${opts.min}` : `${opts.min}-${opts.max}`} caracteres.` };
      if (opts.digitsOnly && !/^\d+$/.test(v)) return { ok: false, error: "Solo dígitos." };
      return { ok: true, normalized: v };
    },
  };
}

function regexRule(opts: { name: string; example: string; regex: RegExp; normalize?: (s: string) => string }): IdRule {
  return {
    name: opts.name,
    example: opts.example,
    format: opts.normalize ?? upper,
    validate(raw) {
      const v = (opts.normalize ?? upper)(raw);
      if (!v) return { ok: false, error: `${opts.name} requerido.` };
      if (!opts.regex.test(v)) return { ok: false, error: `Formato inválido. Ej: ${opts.example}` };
      return { ok: true, normalized: v };
    },
  };
}

const RAW: Array<Omit<CountryEntry, "flag">> = [
  /* ────────── Strict-algorithm countries ────────── */
  { code: "DO", nameEs: "República Dominicana", nameEn: "Dominican Republic", nationalityEs: "Dominicana",
    nationalId: {
      name: "Cédula",
      example: "001-1234567-8",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 11);
        if (d.length <= 3) return d;
        if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (!d) return { ok: false, error: "Cédula requerida." };
        if (d.length !== 11) return { ok: false, error: "La cédula debe tener 11 dígitos." };
        if (dgiiCedulaChecksum(d.slice(0, 10)) !== Number(d[10]))
          return { ok: false, error: "Cédula inválida (dígito verificador no coincide)." };
        return { ok: true, normalized: `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}` };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "AB1234567" } },

  { code: "US", nameEs: "Estados Unidos", nameEn: "United States", nationalityEs: "Estadounidense",
    nationalId: {
      name: "SSN",
      example: "123-45-6789",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 9);
        if (d.length <= 3) return d;
        if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 9) return { ok: false, error: "SSN debe tener 9 dígitos." };
        if (/^000/.test(d) || /^666/.test(d) || /^9/.test(d)) return { ok: false, error: "Rango de SSN inválido." };
        if (d.slice(3, 5) === "00" || d.slice(5) === "0000") return { ok: false, error: "SSN inválido." };
        return { ok: true, normalized: `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` };
      },
    },
    passport: { regex: /^[A-Z0-9]{6,9}$/, example: "123456789" } },

  { code: "CA", nameEs: "Canadá", nameEn: "Canada", nationalityEs: "Canadiense",
    nationalId: {
      name: "SIN",
      example: "123-456-789",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 9);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 9) return { ok: false, error: "SIN debe tener 9 dígitos." };
        if (!luhn(d)) return { ok: false, error: "SIN inválido (Luhn no coincide)." };
        return { ok: true, normalized: `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "GA123456" } },

  { code: "ES", nameEs: "España", nameEn: "Spain", nationalityEs: "Española",
    nationalId: {
      name: "DNI/NIE",
      example: "12345678Z",
      format: upper,
      validate(raw) {
        const v = upper(raw);
        const dni = /^(\d{8})([A-Z])$/.exec(v);
        const nie = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
        if (dni) {
          const expected = spainDniLetter(Number(dni[1]));
          if (expected !== dni[2]) return { ok: false, error: "Letra de DNI incorrecta." };
          return { ok: true, normalized: v };
        }
        if (nie) {
          const prefix = "XYZ".indexOf(nie[1]);
          const expected = spainDniLetter(Number(`${prefix}${nie[2]}`));
          if (expected !== nie[3]) return { ok: false, error: "Letra de NIE incorrecta." };
          return { ok: true, normalized: v };
        }
        return { ok: false, error: "Formato DNI/NIE inválido. Ej: 12345678Z o X1234567L" };
      },
    },
    passport: { regex: /^[A-Z]{3}\d{6}[A-Z]?$/, example: "ABC123456" } },

  { code: "MX", nameEs: "México", nameEn: "Mexico", nationalityEs: "Mexicana",
    nationalId: {
      name: "CURP",
      example: "BADD110313HCMLNS09",
      format: upper,
      validate(raw) {
        const v = upper(raw);
        if (!mexicoCurpValid(v)) return { ok: false, error: "CURP inválido (formato o dígito verificador)." };
        return { ok: true, normalized: v };
      },
    },
    passport: { regex: /^[A-Z0-9]{8,9}$/, example: "G12345678" } },

  { code: "AR", nameEs: "Argentina", nameEn: "Argentina", nationalityEs: "Argentina",
    nationalId: lengthRule({ name: "DNI", example: "20123456", min: 7, max: 8, digitsOnly: true }),
    passport: { regex: /^[A-Z]{3}\d{6}$/, example: "AAA123456" } },

  { code: "CL", nameEs: "Chile", nameEn: "Chile", nationalityEs: "Chilena",
    nationalId: {
      name: "RUT",
      example: "12.345.678-5",
      format: (raw) => {
        const cleaned = raw.replace(/[^\dkK]/g, "").toUpperCase().slice(0, 9);
        if (cleaned.length <= 1) return cleaned;
        return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
      },
      validate(raw) {
        const cleaned = raw.replace(/[^\dkK]/g, "").toUpperCase();
        if (cleaned.length < 8 || cleaned.length > 9) return { ok: false, error: "RUT debe tener 8-9 caracteres." };
        const body = cleaned.slice(0, -1);
        const dv = cleaned.slice(-1);
        if (chileRutDigit(body) !== dv) return { ok: false, error: "Dígito verificador RUT incorrecto." };
        return { ok: true, normalized: `${body}-${dv}` };
      },
    },
    passport: { regex: /^[A-Z0-9]{6,9}$/, example: "C12345678" } },

  { code: "CO", nameEs: "Colombia", nameEn: "Colombia", nationalityEs: "Colombiana",
    nationalId: lengthRule({ name: "Cédula", example: "1023456789", min: 6, max: 10, digitsOnly: true }),
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "PE123456" } },

  { code: "PE", nameEs: "Perú", nameEn: "Peru", nationalityEs: "Peruana",
    nationalId: lengthRule({ name: "DNI", example: "12345678", min: 8, max: 8, digitsOnly: true }),
    passport: { regex: /^\d{8,9}$/, example: "12345678" } },

  { code: "VE", nameEs: "Venezuela", nameEn: "Venezuela", nationalityEs: "Venezolana",
    nationalId: regexRule({ name: "Cédula", example: "V-12345678", regex: /^[VE]-?\d{7,9}$/, normalize: upper }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },

  { code: "BR", nameEs: "Brasil", nameEn: "Brazil", nationalityEs: "Brasileña",
    nationalId: {
      name: "CPF",
      example: "123.456.789-09",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 11);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
        if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
        return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 11) return { ok: false, error: "CPF debe tener 11 dígitos." };
        if (!brazilCpfValid(d)) return { ok: false, error: "CPF inválido (dígito verificador)." };
        return { ok: true, normalized: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "FZ123456" } },

  { code: "EC", nameEs: "Ecuador", nameEn: "Ecuador", nationalityEs: "Ecuatoriana",
    nationalId: {
      name: "Cédula",
      example: "1234567890",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 10) return { ok: false, error: "Cédula debe tener 10 dígitos." };
        if (!ecuadorCedulaValid(d)) return { ok: false, error: "Cédula ecuatoriana inválida." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z0-9]{6,12}$/, example: "AB1234567" } },

  { code: "UY", nameEs: "Uruguay", nameEn: "Uruguay", nationalityEs: "Uruguaya",
    nationalId: {
      name: "CI",
      example: "1.234.567-2",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!uruguayCiValid(d)) return { ok: false, error: "CI uruguaya inválida." };
        return { ok: true, normalized: d };
      },
    } },

  { code: "PY", nameEs: "Paraguay", nameEn: "Paraguay", nationalityEs: "Paraguaya",
    nationalId: lengthRule({ name: "CI", example: "1234567", min: 6, max: 8, digitsOnly: true }) },

  { code: "BO", nameEs: "Bolivia", nameEn: "Bolivia", nationalityEs: "Boliviana",
    nationalId: lengthRule({ name: "CI", example: "1234567", min: 6, max: 10, digitsOnly: true }) },

  { code: "CR", nameEs: "Costa Rica", nameEn: "Costa Rica", nationalityEs: "Costarricense",
    nationalId: lengthRule({ name: "Cédula", example: "123456789", min: 9, max: 9, digitsOnly: true }) },

  { code: "PA", nameEs: "Panamá", nameEn: "Panama", nationalityEs: "Panameña",
    nationalId: regexRule({ name: "Cédula", example: "8-123-456", regex: /^[\dPENE]{1,4}-?\d{1,4}-?\d{1,6}$/ }),
    passport: { regex: /^[A-Z0-9]{7,9}$/, example: "PA1234567" } },

  { code: "GT", nameEs: "Guatemala", nameEn: "Guatemala", nationalityEs: "Guatemalteca",
    nationalId: lengthRule({ name: "CUI/DPI", example: "1234567890101", min: 13, max: 13, digitsOnly: true }) },

  { code: "HN", nameEs: "Honduras", nameEn: "Honduras", nationalityEs: "Hondureña",
    nationalId: lengthRule({ name: "ID", example: "0801199012345", min: 13, max: 13, digitsOnly: true }) },

  { code: "SV", nameEs: "El Salvador", nameEn: "El Salvador", nationalityEs: "Salvadoreña",
    nationalId: {
      name: "DUI",
      example: "01234567-8",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 9);
        return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8)}` : d;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (!svDuiValid(d)) return { ok: false, error: "DUI inválido (dígito verificador)." };
        return { ok: true, normalized: `${d.slice(0, 8)}-${d.slice(8)}` };
      },
    } },

  { code: "NI", nameEs: "Nicaragua", nameEn: "Nicaragua", nationalityEs: "Nicaragüense",
    nationalId: regexRule({ name: "Cédula", example: "001-010180-1000A", regex: /^\d{3}-?\d{6}-?\d{4}[A-Z]$/, normalize: upper }) },

  { code: "CU", nameEs: "Cuba", nameEn: "Cuba", nationalityEs: "Cubana",
    nationalId: lengthRule({ name: "CI", example: "12345678901", min: 11, max: 11, digitsOnly: true }),
    passport: { regex: /^[A-Z]\d{6}$/, example: "B123456" } },

  { code: "HT", nameEs: "Haití", nameEn: "Haiti", nationalityEs: "Haitiana",
    nationalId: lengthRule({ name: "CIN/NIF", example: "1234567890", min: 9, max: 10, digitsOnly: true }),
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "AA123456" } },

  { code: "FR", nameEs: "Francia", nameEn: "France", nationalityEs: "Francesa",
    nationalId: {
      name: "NIR",
      example: "1850578006048 22",
      format: (raw) => onlyDigits(raw).slice(0, 15),
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 15) return { ok: false, error: "NIR debe tener 15 dígitos." };
        if (!franceNirValid(d)) return { ok: false, error: "NIR inválido (mod 97 no coincide)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^\d{2}[A-Z]{2}\d{5}$/, example: "12AB34567" } },

  { code: "IT", nameEs: "Italia", nameEn: "Italy", nationalityEs: "Italiana",
    nationalId: {
      name: "Codice Fiscale",
      example: "RSSMRA85T10A562S",
      format: upper,
      validate(raw) {
        const v = upper(raw);
        if (!italyCfValid(v)) return { ok: false, error: "Codice Fiscale inválido." };
        return { ok: true, normalized: v };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "AA1234567" } },

  { code: "DE", nameEs: "Alemania", nameEn: "Germany", nationalityEs: "Alemana",
    nationalId: lengthRule({ name: "Personalausweis", example: "L01X00T47", min: 9, max: 10, format: upper }),
    passport: { regex: /^[CFGHJK]\d{8}[A-Z0-9]?$/, example: "C12345678" } },

  { code: "GB", nameEs: "Reino Unido", nameEn: "United Kingdom", nationalityEs: "Británica",
    nationalId: regexRule({ name: "NINO", example: "QQ123456C", regex: /^[A-CEGHJ-NPR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/, normalize: upper }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },

  { code: "BE", nameEs: "Bélgica", nameEn: "Belgium", nationalityEs: "Belga",
    nationalId: {
      name: "Rijksregister",
      example: "85.07.30-033.28",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 11) return { ok: false, error: "Rijksregisternummer debe tener 11 dígitos." };
        if (!belgiumNrnValid(d)) return { ok: false, error: "Número inválido (mod 97 no coincide)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "EM123456" } },

  { code: "NL", nameEs: "Países Bajos", nameEn: "Netherlands", nationalityEs: "Neerlandesa",
    nationalId: {
      name: "BSN",
      example: "123456789",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!netherlandsBsnValid(d)) return { ok: false, error: "BSN inválido (11-test)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]{2}[A-Z0-9]{6}\d$/, example: "NS1234567" } },

  { code: "PT", nameEs: "Portugal", nameEn: "Portugal", nationalityEs: "Portuguesa",
    nationalId: {
      name: "NIF",
      example: "123456789",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!portugalNifValid(d)) return { ok: false, error: "NIF inválido (mod 11)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]{1,2}\d{6,7}$/, example: "L123456" } },

  { code: "PL", nameEs: "Polonia", nameEn: "Poland", nationalityEs: "Polaca",
    nationalId: {
      name: "PESEL",
      example: "44051401359",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!peselValid(d)) return { ok: false, error: "PESEL inválido." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "AA1234567" } },

  { code: "SE", nameEs: "Suecia", nameEn: "Sweden", nationalityEs: "Sueca",
    nationalId: {
      name: "Personnummer",
      example: "811228-9874",
      format: (raw) => onlyDigits(raw).slice(0, 12),
      validate(raw) {
        const d = onlyDigits(raw);
        const last10 = d.length === 12 ? d.slice(2) : d;
        if (!swedenPnrValid(last10)) return { ok: false, error: "Personnummer inválido (Luhn)." };
        return { ok: true, normalized: `${last10.slice(0, 6)}-${last10.slice(6)}` };
      },
    },
    passport: { regex: /^\d{8}$/, example: "12345678" } },

  { code: "NO", nameEs: "Noruega", nameEn: "Norway", nationalityEs: "Noruega",
    nationalId: {
      name: "Fødselsnummer",
      example: "31108522932",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!norwayFnrValid(d)) return { ok: false, error: "Fødselsnummer inválido." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^\d{8}$/, example: "12345678" } },

  { code: "DK", nameEs: "Dinamarca", nameEn: "Denmark", nationalityEs: "Danesa",
    nationalId: {
      name: "CPR",
      example: "010180-1234",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 10);
        return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (!denmarkCprValid(d)) return { ok: false, error: "CPR inválido." };
        return { ok: true, normalized: `${d.slice(0, 6)}-${d.slice(6)}` };
      },
    },
    passport: { regex: /^\d{9}$/, example: "123456789" } },

  { code: "FI", nameEs: "Finlandia", nameEn: "Finland", nationalityEs: "Finlandesa",
    nationalId: {
      name: "HETU",
      example: "131052-308T",
      format: upper,
      validate(raw) {
        const v = upper(raw);
        if (!finlandHetuValid(v)) return { ok: false, error: "HETU inválido." };
        return { ok: true, normalized: v };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "PA1234567" } },

  { code: "CZ", nameEs: "República Checa", nameEn: "Czech Republic", nationalityEs: "Checa",
    nationalId: {
      name: "Rodné číslo",
      example: "7706231121",
      format: (raw) => onlyDigits(raw).slice(0, 10),
      validate(raw) {
        const d = onlyDigits(raw);
        if (!czRcValid(d)) return { ok: false, error: "Rodné číslo inválido." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^\d{8}$/, example: "12345678" } },

  { code: "SK", nameEs: "Eslovaquia", nameEn: "Slovakia", nationalityEs: "Eslovaca",
    nationalId: {
      name: "Rodné číslo",
      example: "8909151234",
      format: (raw) => onlyDigits(raw).slice(0, 10),
      validate(raw) {
        const d = onlyDigits(raw);
        if (!czRcValid(d)) return { ok: false, error: "Rodné číslo inválido." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "AA123456" } },

  { code: "TR", nameEs: "Turquía", nameEn: "Turkey", nationalityEs: "Turca",
    nationalId: {
      name: "TC Kimlik",
      example: "12345678901",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!turkeyTcValid(d)) return { ok: false, error: "TC Kimlik inválido." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]\d{8}$/, example: "U12345678" } },

  { code: "IL", nameEs: "Israel", nameEn: "Israel", nationalityEs: "Israelí",
    nationalId: {
      name: "Teudat Zehut",
      example: "123456782",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (!israelTzValid(d)) return { ok: false, error: "Teudat Zehut inválido (Luhn)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^\d{8,9}$/, example: "12345678" } },

  { code: "IN", nameEs: "India", nameEn: "India", nationalityEs: "India",
    nationalId: {
      name: "Aadhaar",
      example: "234123412346",
      format: (raw) => onlyDigits(raw).slice(0, 12),
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 12) return { ok: false, error: "Aadhaar debe tener 12 dígitos." };
        if (d[0] === "0" || d[0] === "1") return { ok: false, error: "Aadhaar no inicia con 0 o 1." };
        if (!verhoeff(d)) return { ok: false, error: "Aadhaar inválido (Verhoeff)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-PR-WYa-pr-wy][1-9]\d{6}$/, example: "M1234567" } },

  { code: "CN", nameEs: "China", nameEn: "China", nationalityEs: "China",
    nationalId: {
      name: "Resident ID",
      example: "11010119900101001X",
      format: (raw) => raw.toUpperCase().replace(/[^0-9X]/g, "").slice(0, 18),
      validate(raw) {
        const v = raw.toUpperCase().replace(/[^0-9X]/g, "");
        if (!chinaRidValid(v)) return { ok: false, error: "Resident ID inválido (ISO 7064)." };
        return { ok: true, normalized: v };
      },
    },
    passport: { regex: /^[GE]\d{8}$/, example: "G12345678" } },

  { code: "KR", nameEs: "Corea del Sur", nameEn: "South Korea", nationalityEs: "Surcoreana",
    nationalId: {
      name: "RRN",
      example: "800101-1234567",
      format: (raw) => {
        const d = onlyDigits(raw).slice(0, 13);
        return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
      },
      validate(raw) {
        const d = onlyDigits(raw);
        if (!koreaRrnValid(d)) return { ok: false, error: "RRN inválido." };
        return { ok: true, normalized: `${d.slice(0, 6)}-${d.slice(6)}` };
      },
    },
    passport: { regex: /^[A-Z]\d{8}$/, example: "M12345678" } },

  { code: "JP", nameEs: "Japón", nameEn: "Japan", nationalityEs: "Japonesa",
    nationalId: lengthRule({ name: "My Number", example: "123456789012", min: 12, max: 12, digitsOnly: true }),
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "TK1234567" } },

  { code: "ZA", nameEs: "Sudáfrica", nameEn: "South Africa", nationalityEs: "Sudafricana",
    nationalId: {
      name: "ID Number",
      example: "8001015009087",
      format: onlyDigits,
      validate(raw) {
        const d = onlyDigits(raw);
        if (d.length !== 13) return { ok: false, error: "ID debe tener 13 dígitos." };
        if (!luhn(d)) return { ok: false, error: "ID Number inválido (Luhn)." };
        return { ok: true, normalized: d };
      },
    },
    passport: { regex: /^[A-Z]\d{8}$/, example: "M12345678" } },

  /* ────────── Length-only countries (no public checksum or omitted) ────────── */
  { code: "AT", nameEs: "Austria", nameEn: "Austria", nationalityEs: "Austriaca",
    passport: { regex: /^[A-Z]\d{7}$/, example: "U1234567" } },
  { code: "AU", nameEs: "Australia", nameEn: "Australia", nationalityEs: "Australiana",
    passport: { regex: /^[A-Z]\d{7}$/, example: "N1234567" } },
  { code: "BG", nameEs: "Bulgaria", nameEn: "Bulgaria", nationalityEs: "Búlgara",
    nationalId: lengthRule({ name: "EGN", example: "7523169263", min: 10, max: 10, digitsOnly: true }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },
  { code: "CH", nameEs: "Suiza", nameEn: "Switzerland", nationalityEs: "Suiza",
    passport: { regex: /^[A-Z]\d{7}$/, example: "X1234567" } },
  { code: "CY", nameEs: "Chipre", nameEn: "Cyprus", nationalityEs: "Chipriota",
    passport: { regex: /^[A-Z]\d{7}$/, example: "K1234567" } },
  { code: "EE", nameEs: "Estonia", nameEn: "Estonia", nationalityEs: "Estonia",
    nationalId: lengthRule({ name: "ID", example: "37605030299", min: 11, max: 11, digitsOnly: true }),
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "KA1234567" } },
  { code: "EG", nameEs: "Egipto", nameEn: "Egypt", nationalityEs: "Egipcia",
    nationalId: lengthRule({ name: "ID", example: "29001011234567", min: 14, max: 14, digitsOnly: true }),
    passport: { regex: /^[A-Z]\d{8}$/, example: "A12345678" } },
  { code: "GR", nameEs: "Grecia", nameEn: "Greece", nationalityEs: "Griega",
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "AB1234567" } },
  { code: "HR", nameEs: "Croacia", nameEn: "Croatia", nationalityEs: "Croata",
    nationalId: lengthRule({ name: "OIB", example: "12345678903", min: 11, max: 11, digitsOnly: true }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },
  { code: "HU", nameEs: "Hungría", nameEn: "Hungary", nationalityEs: "Húngara",
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "ZA123456" } },
  { code: "ID", nameEs: "Indonesia", nameEn: "Indonesia", nationalityEs: "Indonesia",
    nationalId: lengthRule({ name: "NIK", example: "3201010101010001", min: 16, max: 16, digitsOnly: true }),
    passport: { regex: /^[A-Z]\d{7}$/, example: "C1234567" } },
  { code: "IE", nameEs: "Irlanda", nameEn: "Ireland", nationalityEs: "Irlandesa",
    nationalId: regexRule({ name: "PPSN", example: "1234567T", regex: /^\d{7}[A-W][A-IW]?$/, normalize: upper }),
    passport: { regex: /^[A-Z0-9]{7,9}$/, example: "PA1234567" } },
  { code: "LT", nameEs: "Lituania", nameEn: "Lithuania", nationalityEs: "Lituana",
    nationalId: lengthRule({ name: "Asmens kodas", example: "38001085739", min: 11, max: 11, digitsOnly: true }) },
  { code: "LV", nameEs: "Letonia", nameEn: "Latvia", nationalityEs: "Letona",
    passport: { regex: /^[A-Z0-9]{8}$/, example: "LV1234567" } },
  { code: "MT", nameEs: "Malta", nameEn: "Malta", nationalityEs: "Maltesa",
    nationalId: regexRule({ name: "ID Card", example: "1234567M", regex: /^\d{7}[A-Z]$/, normalize: upper }),
    passport: { regex: /^\d{7}$/, example: "1234567" } },
  { code: "MY", nameEs: "Malasia", nameEn: "Malaysia", nationalityEs: "Malasia",
    nationalId: lengthRule({ name: "MyKad", example: "800101086543", min: 12, max: 12, digitsOnly: true }),
    passport: { regex: /^[AHK]\d{8}$/, example: "A12345678" } },
  { code: "NG", nameEs: "Nigeria", nameEn: "Nigeria", nationalityEs: "Nigeriana",
    nationalId: lengthRule({ name: "NIN", example: "12345678901", min: 11, max: 11, digitsOnly: true }),
    passport: { regex: /^[A-Z]\d{8}$/, example: "A12345678" } },
  { code: "NZ", nameEs: "Nueva Zelanda", nameEn: "New Zealand", nationalityEs: "Neozelandesa",
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "LA123456" } },
  { code: "PH", nameEs: "Filipinas", nameEn: "Philippines", nationalityEs: "Filipina",
    nationalId: regexRule({ name: "PhilSys ID", example: "1234-5678901-2", regex: /^\d{4}-?\d{7}-?\d$/, normalize: onlyDigits }),
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "EB1234567" } },
  { code: "PK", nameEs: "Pakistán", nameEn: "Pakistan", nationalityEs: "Pakistaní",
    nationalId: lengthRule({ name: "CNIC", example: "12345-1234567-1", min: 13, max: 13, digitsOnly: true }),
    passport: { regex: /^[A-Z]{2}\d{7}$/, example: "AB1234567" } },
  { code: "RO", nameEs: "Rumanía", nameEn: "Romania", nationalityEs: "Rumana",
    nationalId: lengthRule({ name: "CNP", example: "1900801123456", min: 13, max: 13, digitsOnly: true }),
    passport: { regex: /^\d{8,9}$/, example: "12345678" } },
  { code: "RS", nameEs: "Serbia", nameEn: "Serbia", nationalityEs: "Serbia",
    nationalId: lengthRule({ name: "JMBG", example: "0101006500006", min: 13, max: 13, digitsOnly: true }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },
  { code: "RU", nameEs: "Rusia", nameEn: "Russia", nationalityEs: "Rusa",
    nationalId: lengthRule({ name: "Passport interno", example: "1234567890", min: 10, max: 10, digitsOnly: true }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },
  { code: "SA", nameEs: "Arabia Saudita", nameEn: "Saudi Arabia", nationalityEs: "Saudita",
    nationalId: lengthRule({ name: "Iqama", example: "1234567890", min: 10, max: 10, digitsOnly: true }),
    passport: { regex: /^[A-Z]\d{8}$/, example: "M12345678" } },
  { code: "SG", nameEs: "Singapur", nameEn: "Singapore", nationalityEs: "Singapurense",
    nationalId: regexRule({ name: "NRIC", example: "S1234567A", regex: /^[STFG]\d{7}[A-Z]$/, normalize: upper }),
    passport: { regex: /^[KE]\d{7}[A-Z]$/, example: "E1234567A" } },
  { code: "SI", nameEs: "Eslovenia", nameEn: "Slovenia", nationalityEs: "Eslovena",
    passport: { regex: /^P[A-Z]\d{7}$/, example: "PA1234567" } },
  { code: "LK", nameEs: "Sri Lanka", nameEn: "Sri Lanka", nationalityEs: "Ceilanesa",
    nationalId: regexRule({ name: "NIC", example: "199512345678", regex: /^(\d{9}[VvXx]|\d{12})$/, normalize: upper }),
    passport: { regex: /^[A-Z]\d{7}$/, example: "N1234567" } },
  { code: "TH", nameEs: "Tailandia", nameEn: "Thailand", nationalityEs: "Tailandesa",
    nationalId: lengthRule({ name: "ID", example: "1234567890123", min: 13, max: 13, digitsOnly: true }),
    passport: { regex: /^[A-Z]{1,2}\d{7}$/, example: "AA1234567" } },
  { code: "TW", nameEs: "Taiwán", nameEn: "Taiwan", nationalityEs: "Taiwanesa",
    nationalId: regexRule({ name: "ID", example: "A123456789", regex: /^[A-Z][12]\d{8}$/, normalize: upper }),
    passport: { regex: /^\d{9}$/, example: "123456789" } },
  { code: "UA", nameEs: "Ucrania", nameEn: "Ukraine", nationalityEs: "Ucraniana",
    nationalId: lengthRule({ name: "ID", example: "1234567890", min: 10, max: 10, digitsOnly: true }),
    passport: { regex: /^[A-Z]{2}\d{6}$/, example: "FA123456" } },
  { code: "VN", nameEs: "Vietnam", nameEn: "Vietnam", nationalityEs: "Vietnamita",
    nationalId: lengthRule({ name: "CCCD", example: "012345678901", min: 12, max: 12, digitsOnly: true }),
    passport: { regex: /^[A-Z]\d{7}$/, example: "B1234567" } },

  /* ────────── Remaining ISO 3166-1 countries (no national-ID rule, free-text passport) ────────── */
  { code: "AF", nameEs: "Afganistán", nameEn: "Afghanistan", nationalityEs: "Afgana" },
  { code: "AL", nameEs: "Albania", nameEn: "Albania", nationalityEs: "Albanesa" },
  { code: "DZ", nameEs: "Argelia", nameEn: "Algeria", nationalityEs: "Argelina" },
  { code: "AD", nameEs: "Andorra", nameEn: "Andorra", nationalityEs: "Andorrana" },
  { code: "AO", nameEs: "Angola", nameEn: "Angola", nationalityEs: "Angoleña" },
  { code: "AG", nameEs: "Antigua y Barbuda", nameEn: "Antigua and Barbuda", nationalityEs: "Antiguana" },
  { code: "AM", nameEs: "Armenia", nameEn: "Armenia", nationalityEs: "Armenia" },
  { code: "AZ", nameEs: "Azerbaiyán", nameEn: "Azerbaijan", nationalityEs: "Azerbaiyana" },
  { code: "BS", nameEs: "Bahamas", nameEn: "Bahamas", nationalityEs: "Bahameña" },
  { code: "BH", nameEs: "Baréin", nameEn: "Bahrain", nationalityEs: "Bareiní" },
  { code: "BD", nameEs: "Bangladés", nameEn: "Bangladesh", nationalityEs: "Bangladesí" },
  { code: "BB", nameEs: "Barbados", nameEn: "Barbados", nationalityEs: "Barbadense" },
  { code: "BY", nameEs: "Bielorrusia", nameEn: "Belarus", nationalityEs: "Bielorrusa" },
  { code: "BZ", nameEs: "Belice", nameEn: "Belize", nationalityEs: "Beliceña" },
  { code: "BJ", nameEs: "Benín", nameEn: "Benin", nationalityEs: "Beninesa" },
  { code: "BT", nameEs: "Bután", nameEn: "Bhutan", nationalityEs: "Butanesa" },
  { code: "BA", nameEs: "Bosnia y Herzegovina", nameEn: "Bosnia and Herzegovina", nationalityEs: "Bosnia" },
  { code: "BW", nameEs: "Botsuana", nameEn: "Botswana", nationalityEs: "Botsuana" },
  { code: "BN", nameEs: "Brunéi", nameEn: "Brunei", nationalityEs: "Bruneana" },
  { code: "BF", nameEs: "Burkina Faso", nameEn: "Burkina Faso", nationalityEs: "Burkinesa" },
  { code: "BI", nameEs: "Burundi", nameEn: "Burundi", nationalityEs: "Burundesa" },
  { code: "CV", nameEs: "Cabo Verde", nameEn: "Cape Verde", nationalityEs: "Caboverdiana" },
  { code: "KH", nameEs: "Camboya", nameEn: "Cambodia", nationalityEs: "Camboyana" },
  { code: "CM", nameEs: "Camerún", nameEn: "Cameroon", nationalityEs: "Camerunesa" },
  { code: "CF", nameEs: "República Centroafricana", nameEn: "Central African Republic", nationalityEs: "Centroafricana" },
  { code: "TD", nameEs: "Chad", nameEn: "Chad", nationalityEs: "Chadiana" },
  { code: "KM", nameEs: "Comoras", nameEn: "Comoros", nationalityEs: "Comorense" },
  { code: "CG", nameEs: "Congo", nameEn: "Congo", nationalityEs: "Congoleña" },
  { code: "CD", nameEs: "República Democrática del Congo", nameEn: "DR Congo", nationalityEs: "Congoleña" },
  { code: "CI", nameEs: "Costa de Marfil", nameEn: "Ivory Coast", nationalityEs: "Marfileña" },
  { code: "DJ", nameEs: "Yibuti", nameEn: "Djibouti", nationalityEs: "Yibutiana" },
  { code: "DM", nameEs: "Dominica", nameEn: "Dominica", nationalityEs: "Dominiquesa" },
  { code: "GQ", nameEs: "Guinea Ecuatorial", nameEn: "Equatorial Guinea", nationalityEs: "Ecuatoguineana" },
  { code: "ER", nameEs: "Eritrea", nameEn: "Eritrea", nationalityEs: "Eritrea" },
  { code: "SZ", nameEs: "Esuatini", nameEn: "Eswatini", nationalityEs: "Suazi" },
  { code: "ET", nameEs: "Etiopía", nameEn: "Ethiopia", nationalityEs: "Etíope" },
  { code: "FJ", nameEs: "Fiyi", nameEn: "Fiji", nationalityEs: "Fiyiana" },
  { code: "GA", nameEs: "Gabón", nameEn: "Gabon", nationalityEs: "Gabonesa" },
  { code: "GM", nameEs: "Gambia", nameEn: "Gambia", nationalityEs: "Gambiana" },
  { code: "GE", nameEs: "Georgia", nameEn: "Georgia", nationalityEs: "Georgiana" },
  { code: "GH", nameEs: "Ghana", nameEn: "Ghana", nationalityEs: "Ghanesa" },
  { code: "GD", nameEs: "Granada", nameEn: "Grenada", nationalityEs: "Granadina" },
  { code: "GN", nameEs: "Guinea", nameEn: "Guinea", nationalityEs: "Guineana" },
  { code: "GW", nameEs: "Guinea-Bisáu", nameEn: "Guinea-Bissau", nationalityEs: "Guineana" },
  { code: "GY", nameEs: "Guyana", nameEn: "Guyana", nationalityEs: "Guyanesa" },
  { code: "IS", nameEs: "Islandia", nameEn: "Iceland", nationalityEs: "Islandesa" },
  { code: "IR", nameEs: "Irán", nameEn: "Iran", nationalityEs: "Iraní" },
  { code: "IQ", nameEs: "Irak", nameEn: "Iraq", nationalityEs: "Iraquí" },
  { code: "JM", nameEs: "Jamaica", nameEn: "Jamaica", nationalityEs: "Jamaicana" },
  { code: "JO", nameEs: "Jordania", nameEn: "Jordan", nationalityEs: "Jordana" },
  { code: "KZ", nameEs: "Kazajistán", nameEn: "Kazakhstan", nationalityEs: "Kazaja" },
  { code: "KE", nameEs: "Kenia", nameEn: "Kenya", nationalityEs: "Keniana" },
  { code: "KI", nameEs: "Kiribati", nameEn: "Kiribati", nationalityEs: "Kiribatiana" },
  { code: "KP", nameEs: "Corea del Norte", nameEn: "North Korea", nationalityEs: "Norcoreana" },
  { code: "KW", nameEs: "Kuwait", nameEn: "Kuwait", nationalityEs: "Kuwaití" },
  { code: "KG", nameEs: "Kirguistán", nameEn: "Kyrgyzstan", nationalityEs: "Kirguís" },
  { code: "LA", nameEs: "Laos", nameEn: "Laos", nationalityEs: "Laosiana" },
  { code: "LB", nameEs: "Líbano", nameEn: "Lebanon", nationalityEs: "Libanesa" },
  { code: "LS", nameEs: "Lesoto", nameEn: "Lesotho", nationalityEs: "Lesotense" },
  { code: "LR", nameEs: "Liberia", nameEn: "Liberia", nationalityEs: "Liberiana" },
  { code: "LY", nameEs: "Libia", nameEn: "Libya", nationalityEs: "Libia" },
  { code: "LI", nameEs: "Liechtenstein", nameEn: "Liechtenstein", nationalityEs: "Liechtensteiniana" },
  { code: "LU", nameEs: "Luxemburgo", nameEn: "Luxembourg", nationalityEs: "Luxemburguesa" },
  { code: "MG", nameEs: "Madagascar", nameEn: "Madagascar", nationalityEs: "Malgache" },
  { code: "MW", nameEs: "Malaui", nameEn: "Malawi", nationalityEs: "Malauí" },
  { code: "MV", nameEs: "Maldivas", nameEn: "Maldives", nationalityEs: "Maldiva" },
  { code: "ML", nameEs: "Malí", nameEn: "Mali", nationalityEs: "Maliense" },
  { code: "MH", nameEs: "Islas Marshall", nameEn: "Marshall Islands", nationalityEs: "Marshalesa" },
  { code: "MR", nameEs: "Mauritania", nameEn: "Mauritania", nationalityEs: "Mauritana" },
  { code: "MU", nameEs: "Mauricio", nameEn: "Mauritius", nationalityEs: "Mauriciana" },
  { code: "FM", nameEs: "Micronesia", nameEn: "Micronesia", nationalityEs: "Micronesia" },
  { code: "MD", nameEs: "Moldavia", nameEn: "Moldova", nationalityEs: "Moldava" },
  { code: "MC", nameEs: "Mónaco", nameEn: "Monaco", nationalityEs: "Monegasca" },
  { code: "MN", nameEs: "Mongolia", nameEn: "Mongolia", nationalityEs: "Mongola" },
  { code: "ME", nameEs: "Montenegro", nameEn: "Montenegro", nationalityEs: "Montenegrina" },
  { code: "MA", nameEs: "Marruecos", nameEn: "Morocco", nationalityEs: "Marroquí" },
  { code: "MZ", nameEs: "Mozambique", nameEn: "Mozambique", nationalityEs: "Mozambiqueña" },
  { code: "MM", nameEs: "Birmania", nameEn: "Myanmar", nationalityEs: "Birmana" },
  { code: "NA", nameEs: "Namibia", nameEn: "Namibia", nationalityEs: "Namibia" },
  { code: "NR", nameEs: "Nauru", nameEn: "Nauru", nationalityEs: "Nauruana" },
  { code: "NP", nameEs: "Nepal", nameEn: "Nepal", nationalityEs: "Nepalí" },
  { code: "NE", nameEs: "Níger", nameEn: "Niger", nationalityEs: "Nigerina" },
  { code: "MK", nameEs: "Macedonia del Norte", nameEn: "North Macedonia", nationalityEs: "Macedonia" },
  { code: "OM", nameEs: "Omán", nameEn: "Oman", nationalityEs: "Omaní" },
  { code: "PW", nameEs: "Palaos", nameEn: "Palau", nationalityEs: "Palauense" },
  { code: "PG", nameEs: "Papúa Nueva Guinea", nameEn: "Papua New Guinea", nationalityEs: "Papú" },
  { code: "QA", nameEs: "Catar", nameEn: "Qatar", nationalityEs: "Catarí" },
  { code: "RW", nameEs: "Ruanda", nameEn: "Rwanda", nationalityEs: "Ruandesa" },
  { code: "KN", nameEs: "San Cristóbal y Nieves", nameEn: "Saint Kitts and Nevis", nationalityEs: "Sancristobaleña" },
  { code: "LC", nameEs: "Santa Lucía", nameEn: "Saint Lucia", nationalityEs: "Santalucense" },
  { code: "VC", nameEs: "San Vicente y las Granadinas", nameEn: "Saint Vincent and the Grenadines", nationalityEs: "Sanvicentina" },
  { code: "WS", nameEs: "Samoa", nameEn: "Samoa", nationalityEs: "Samoana" },
  { code: "SM", nameEs: "San Marino", nameEn: "San Marino", nationalityEs: "Sanmarinense" },
  { code: "ST", nameEs: "Santo Tomé y Príncipe", nameEn: "Sao Tome and Principe", nationalityEs: "Santotomense" },
  { code: "SN", nameEs: "Senegal", nameEn: "Senegal", nationalityEs: "Senegalesa" },
  { code: "SC", nameEs: "Seychelles", nameEn: "Seychelles", nationalityEs: "Seychellense" },
  { code: "SL", nameEs: "Sierra Leona", nameEn: "Sierra Leone", nationalityEs: "Sierraleonesa" },
  { code: "SB", nameEs: "Islas Salomón", nameEn: "Solomon Islands", nationalityEs: "Salomonense" },
  { code: "SO", nameEs: "Somalia", nameEn: "Somalia", nationalityEs: "Somalí" },
  { code: "SS", nameEs: "Sudán del Sur", nameEn: "South Sudan", nationalityEs: "Sursudanesa" },
  { code: "SD", nameEs: "Sudán", nameEn: "Sudan", nationalityEs: "Sudanesa" },
  { code: "SR", nameEs: "Surinam", nameEn: "Suriname", nationalityEs: "Surinamesa" },
  { code: "SY", nameEs: "Siria", nameEn: "Syria", nationalityEs: "Siria" },
  { code: "TJ", nameEs: "Tayikistán", nameEn: "Tajikistan", nationalityEs: "Tayika" },
  { code: "TZ", nameEs: "Tanzania", nameEn: "Tanzania", nationalityEs: "Tanzana" },
  { code: "TL", nameEs: "Timor Oriental", nameEn: "Timor-Leste", nationalityEs: "Timorense" },
  { code: "TG", nameEs: "Togo", nameEn: "Togo", nationalityEs: "Togolesa" },
  { code: "TO", nameEs: "Tonga", nameEn: "Tonga", nationalityEs: "Tongana" },
  { code: "TT", nameEs: "Trinidad y Tobago", nameEn: "Trinidad and Tobago", nationalityEs: "Trinitense" },
  { code: "TN", nameEs: "Túnez", nameEn: "Tunisia", nationalityEs: "Tunecina" },
  { code: "TM", nameEs: "Turkmenistán", nameEn: "Turkmenistan", nationalityEs: "Turcomana" },
  { code: "TV", nameEs: "Tuvalu", nameEn: "Tuvalu", nationalityEs: "Tuvaluana" },
  { code: "UG", nameEs: "Uganda", nameEn: "Uganda", nationalityEs: "Ugandesa" },
  { code: "AE", nameEs: "Emiratos Árabes Unidos", nameEn: "United Arab Emirates", nationalityEs: "Emiratí" },
  { code: "UZ", nameEs: "Uzbekistán", nameEn: "Uzbekistan", nationalityEs: "Uzbeka" },
  { code: "VU", nameEs: "Vanuatu", nameEn: "Vanuatu", nationalityEs: "Vanuatuense" },
  { code: "VA", nameEs: "Vaticano", nameEn: "Vatican City", nationalityEs: "Vaticana" },
  { code: "YE", nameEs: "Yemen", nameEn: "Yemen", nationalityEs: "Yemení" },
  { code: "ZM", nameEs: "Zambia", nameEn: "Zambia", nationalityEs: "Zambiana" },
  { code: "ZW", nameEs: "Zimbabue", nameEn: "Zimbabwe", nationalityEs: "Zimbabuense" },
];

function flag(cc: string): string {
  return cc
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)))
    .join("");
}

export const COUNTRIES: CountryEntry[] = RAW
  .map((c) => ({ ...c, flag: flag(c.code) }))
  .sort((a, b) => a.nameEs.localeCompare(b.nameEs, "es"));

const COUNTRY_BY_CODE: Record<string, CountryEntry> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

const COUNTRY_BY_NATIONALITY: Record<string, CountryEntry> = Object.fromEntries(
  COUNTRIES.map((c) => [c.nationalityEs.toLowerCase(), c]),
);

/* ════════════════════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════════════════ */

/** Validates a national ID for the given country. */
export function validateCedula(raw: string, countryCode = "DO"): DocumentValidationResult {
  const country = COUNTRY_BY_CODE[countryCode.toUpperCase()];
  const rule = country?.nationalId;
  if (rule) return rule.validate(raw);

  // Permissive fallback for countries without a defined rule.
  const cleaned = raw.trim();
  if (cleaned.length < 4) return { ok: false, error: "Mínimo 4 caracteres." };
  if (cleaned.length > 25) return { ok: false, error: "Máximo 25 caracteres." };
  return { ok: true, normalized: cleaned };
}

export function validatePassport(raw: string, countryCode = "DO"): DocumentValidationResult {
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  if (!cleaned) return { ok: false, error: "Pasaporte requerido." };
  if (!/^[A-Z0-9]+$/.test(cleaned)) return { ok: false, error: "Solo letras y números." };

  const country = COUNTRY_BY_CODE[countryCode.toUpperCase()];
  const rule = country?.passport;
  if (rule) {
    if (!rule.regex.test(cleaned))
      return { ok: false, error: `Formato inválido para ${country!.nameEs}. Ej: ${rule.example}` };
    return { ok: true, normalized: cleaned };
  }

  if (cleaned.length < 6 || cleaned.length > 12)
    return { ok: false, error: "El pasaporte debe tener entre 6 y 12 caracteres." };
  return { ok: true, normalized: cleaned };
}

export function validateOther(raw: string): DocumentValidationResult {
  const cleaned = raw.trim();
  if (cleaned.length < 4) return { ok: false, error: "Mínimo 4 caracteres." };
  if (cleaned.length > 20) return { ok: false, error: "Máximo 20 caracteres." };
  return { ok: true, normalized: cleaned };
}

export function validateDocument(
  type: "Cedula" | "Passport" | "Other",
  raw: string,
  countryCode = "DO",
): DocumentValidationResult {
  switch (type) {
    case "Cedula": return validateCedula(raw, countryCode);
    case "Passport": return validatePassport(raw, countryCode);
    case "Other": return validateOther(raw);
  }
}

/** Live formatter — applies country-specific transform when present. */
export function formatDocumentInput(
  type: "Cedula" | "Passport" | "Other",
  raw: string,
  countryCode = "DO",
): string {
  if (type === "Cedula") {
    const rule = COUNTRY_BY_CODE[countryCode.toUpperCase()]?.nationalId;
    return rule?.format ? rule.format(raw) : raw;
  }
  if (type === "Passport") return raw.replace(/[\s-]+/g, "").toUpperCase().slice(0, 15);
  return raw;
}

/* Country lookup helpers. */
export function nationalityToCountryCode(nationality?: string | null): string {
  if (!nationality) return "DO";
  const trimmed = nationality.trim();

  const upperCc = trimmed.toUpperCase();
  if (COUNTRY_BY_CODE[upperCc]) return upperCc;

  const byNat = COUNTRY_BY_NATIONALITY[trimmed.toLowerCase()];
  if (byNat) return byNat.code;

  const lower = trimmed.toLowerCase();
  const byName = COUNTRIES.find(
    (c) => c.nameEs.toLowerCase() === lower || c.nameEn.toLowerCase() === lower,
  );
  return byName?.code ?? "DO";
}

export function countryByCode(code?: string | null): CountryEntry | undefined {
  if (!code) return undefined;
  return COUNTRY_BY_CODE[code.toUpperCase()];
}

/** Returns the example placeholder for a given doc type + country. */
export function exampleFor(
  type: "Cedula" | "Passport" | "Other",
  countryCode = "DO",
): string {
  const country = COUNTRY_BY_CODE[countryCode.toUpperCase()];
  if (type === "Cedula") return country?.nationalId?.example ?? "";
  if (type === "Passport") return country?.passport?.example ?? "Pasaporte";
  return "";
}

/** Returns the label for the national ID type (e.g. "Cédula", "CPF", "DNI"). */
export function nationalIdLabel(countryCode = "DO"): string {
  return COUNTRY_BY_CODE[countryCode.toUpperCase()]?.nationalId?.name ?? "ID Nacional";
}

/** Backwards-compatible alias for callers still importing the old list. */
export const PASSPORT_COUNTRIES = COUNTRIES.filter((c) => c.passport).map((c) => c.code);
