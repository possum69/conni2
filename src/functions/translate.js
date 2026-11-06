function translate(key, values = {}) {
  const pageText = (window.pageTranslations[currentPageLanguage] || window.pageTranslations.en)[key];
  const topicText = window.topicFormTranslations[currentPageLanguage]?.[key] || window.topicFormTranslations.en[key];
  const locationText = window.locationFormTranslations[currentPageLanguage]?.[key] || window.locationFormTranslations.en[key];
  let text = pageText || topicText || locationText || window.pageTranslations.en[key] || key;
  Object.entries(values).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });
  return text;
}
