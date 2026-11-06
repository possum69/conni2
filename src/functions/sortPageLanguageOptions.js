function sortPageLanguageOptions() {
  const selector = document.getElementById('page-language-filter');
  const selectedLanguage = selector.value;
  const collator = new Intl.Collator(getPageCollationLocale(), { sensitivity: 'base' });
  const options = Array.from(selector.options).sort((a, b) => collator.compare(a.textContent, b.textContent));
  options.forEach(option => selector.append(option));
  selector.value = selectedLanguage;
}
