/**
 * Counts in admin copy (kiwi-ui/DESIGN.md, Voice and tone > Dates, times and
 * numbers): a fixed en-US grouping ("1,234") and one helper that picks the
 * noun's form, so a row never reads "1 users".
 */

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/** A count with the en-US grouping: 1,234. */
export const formatCount = (n: number): string => COUNT_FORMAT.format(n);

/** The regular plural of one word: s, es after s, x, z, ch and sh, ies after a consonant and y. */
const pluralOf = (word: string): string => {
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
};

/**
 * `{n: count noun}`: the singular when n is exactly 1, the plural otherwise; a
 * noun phrase takes the plural on its last word ("1 pending user", "3 pending users").
 */
export const countNoun = (n: number, noun: string): string => {
  if (n === 1) return `${formatCount(n)} ${noun}`;
  const words = noun.split(" ");
  const last = words.pop() ?? "";
  return `${formatCount(n)} ${[...words, pluralOf(last)].join(" ")}`;
};
