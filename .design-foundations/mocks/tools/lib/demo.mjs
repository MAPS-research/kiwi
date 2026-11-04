// Demo content for the Phase 7 mocks: fictional people (example.edu, the documentation domain), fictional classes,
// files, a student's question, a tutor's answer and code. Content, not interface copy: each piece is recorded through
// data() so the strings audit can tell it from the Phase 5 words (kiwi-ui/DESIGN.md § Voice and tone › Scope places
// the tutor's answers and class instructions outside the voice).
import { data } from "./copy.mjs";

const plain = (html) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const rec = (html) => { if (plain(html).trim()) data(plain(html)); return html; };

export const CLASS = {
  title: "Statistics for the Social Sciences",
  instructor: "Dr. Lena Hartmann",
  email: "lena.hartmann@example.edu",
  description: "Methods for describing survey data and testing claims about it, with weekly labs in R and Python.",
  instructions: "Help students reach the answer with a question or a hint before you give it. Use the lecture slides as the main source and cite the page.",
};
export const CLASSES = [
  { title: "Introduction to Computer Science", instructor: "Dr. Tomás Ortega", cover: "intro-to-cs.webp", nav: "chat" },
  { title: CLASS.title, instructor: CLASS.instructor, cover: null, nav: "chat" },
  { title: "Machine Learning Foundations", instructor: "Prof. Aiko Mori", cover: "machine-learning.webp", nav: "chat" },
  { title: "Data Structures", instructor: "", cover: null, nav: "chat" },
];
export const SIGNIN_EMAIL = "daniel.kim@example.edu";
export const FILES = ["Lecture 1 · Course overview.pdf", "Lecture 2 · Sampling.pdf", "Lecture 3 · Missing data.pdf", "Lecture 4 · Regression.pdf"];
export const FILE_CURRENT = 2;

const c = (s, cls) => `<code${cls ? ` class="${cls}"` : ""}>${s}</code>`; // cls "tight-end": punctuation follows, flush
export const ANSWER = {
  question: rec(`Why does ${c("mean()")} return NA for my income column? 我已经检查过数据了。`),
  p1: rec(`In R, ${c("mean()")} returns ${c("NA")} as soon as one value in the vector is missing. R doesn't guess what the missing value was, so it reports the average as unknown too.`),
  p2: rec(`To average only the values you have, pass ${c("na.rm = TRUE", "tight-end")}:`),
  code: rec(`<span class="s-fn">mean</span><span class="s-op">(</span>income<span class="s-op">,</span> na.rm <span class="s-op">=</span> <span class="s-cst">TRUE</span><span class="s-op">)</span>`),
  math: rec(`<math display="block"><mover><mi>x</mi><mo>¯</mo></mover><mo>=</mo><mfrac><mn>1</mn><mi>n</mi></mfrac><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><msub><mi>x</mi><mi>i</mi></msub></math>`),
  cjk: rec(`在删除缺失值之前，先检查两件事：缺失了多少，以及它们是否随机缺失。如果收入较低的受访者更常跳过这个问题，删除缺失值之后的平均值就会偏高。`),
  p3: rec(`Here n counts only the values that are present. Lecture 3 walks through both checks.`),
};
export const FRAME = {
  older: "Lecture 3 walks through both checks.",
  question: "What if the missing values are not random?",
  answer: "Then dropping them can bias the average. Compare the people who answered with those who didn't, on age or region, before you decide.",
  partial: "Then dropping them can bias the average. Compare the people who",
  typing: "Can I fill them in with the median?",
};

const kw = (s) => `<span class="s-kw">${s}</span>`, bi = (s) => `<span class="s-bi">${s}</span>`, num = (s) => `<span class="s-num">${s}</span>`;
const str = (s) => `<span class="s-str">${s}</span>`, com = (s) => `<span class="s-com">${s}</span>`, op = (s) => `<span class="s-op">${s}</span>`, cst = (s) => `<span class="s-cst">${s}</span>`;
export const CODE = [
  com("# Lecture 3 exercise: the average income, with missing answers"),
  `incomes ${op("=")} ${op("[")}${num("42000")}${op(",")} ${cst("None")}${op(",")} ${num("51500")}${op(",")} ${num("38750")}${op(",")} ${cst("None")}${op(",")} ${num("61200")}${op("]")}`,
  "",
  `known ${op("=")} ${op("[")}x ${kw("for")} x ${kw("in")} incomes ${kw("if")} x ${kw("is not")} ${cst("None")}${op("]")}`,
  `mean_income ${op("=")} ${bi("sum")}${op("(")}known${op(")")} ${op("/")} ${bi("len")}${op("(")}known${op(")")}`,
  "",
  `${bi("print")}${op("(")}${str('f"Answered: {len(known)} of {len(incomes)}"')}${op(")")}`,
  `${bi("print")}${op("(")}${str('f"Mean income: {mean_income:,.0f}"')}${op(")")}`,
].map(rec);
export const CODE_ACTIVE = 7;
export const UPLOADED = "survey.csv";
export const OUTPUT = "Answered: 4 of 6\nMean income: 48,362";

export const TYPED = ["noah.fischer@example.edu", "amara.osei@example.edu"];
export const ROSTER = [
  { email: "lena.hartmann@example.edu", role: "Instructor", status: "Active" },
  { email: "daniel.kim@example.edu", role: "Student", status: "Active" },
  { email: "sofia.rossi@example.edu", role: "Student", status: "Active" },
  { email: "wei.zhang@example.edu", role: "Student", status: "Active" },
  { email: "maya.goldberg@example.edu", role: "Student", status: "Active" },
  { email: "jordan.lee.teaching-assistant-coordinator@example.edu", role: "Student", status: "Active" },
  { email: "priya.nair@example.edu", role: "Student", status: "Active" },
  { email: "omar.haddad@example.edu", role: "Student", status: "Active" },
  { email: "it.services@example.edu", role: "Admin", status: "Active" },
  { email: "elena.popescu@example.edu", role: "Student", status: "Active" },
  { email: "tom.nguyen@example.edu", role: "Student", status: "Pending", selected: true },
  { email: "grace.adeyemi@example.edu", role: "Student", status: "Pending", selected: true },
];
