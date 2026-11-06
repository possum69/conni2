function openLocationTab(locationName) {
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.section');

  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'locations'));
  sections.forEach(section => {
    section.classList.toggle('active', section.id === 'locations-section');
  });

  const target = document.getElementById(`location-${locationName}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
