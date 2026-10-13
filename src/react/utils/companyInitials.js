const normalizeText = value => String(value || '').trim();

export const companyInitialsFromName = name => {
  const words = normalizeText(name).split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return words.length === 1 ? words[0][0].toUpperCase() : '?';
};

export default companyInitialsFromName;
