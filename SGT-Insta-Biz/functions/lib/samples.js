'use strict';

/** Sample packages every new travel site starts with. Owners replace them later. */
function samplePackages() {
  return [
    {
      title: 'Manali Snow Getaway',
      destination: 'Manali, Himachal Pradesh',
      nights: 4,
      days: 5,
      price: 14999,
      highlights: ['Solang Valley & Atal Tunnel', 'Hotel stay with breakfast', 'Volvo bus from Delhi', 'Local sightseeing by cab'],
    },
    {
      title: 'Kerala Backwaters',
      destination: 'Alleppey & Munnar, Kerala',
      nights: 3,
      days: 4,
      price: 12499,
      highlights: ['Overnight houseboat stay', 'Tea gardens in Munnar', 'All transfers included', 'Breakfast & dinner'],
    },
    {
      title: 'Goa Beach Break',
      destination: 'North & South Goa',
      nights: 3,
      days: 4,
      price: 9999,
      highlights: ['Beach-side resort', 'North & South Goa tour', 'River cruise', 'Airport pickup & drop'],
    },
    {
      title: 'Char Dham Yatra',
      destination: 'Uttarakhand',
      nights: 9,
      days: 10,
      price: 32000,
      highlights: ['Yamunotri, Gangotri, Kedarnath, Badrinath', 'Experienced driver & guide', 'All meals', 'Hotel & camp stays'],
    },
  ];
}

module.exports = { samplePackages };
