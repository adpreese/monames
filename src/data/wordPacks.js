export const defaultPacks = [
  {
    id: 'classic',
    name: 'Classic (Original)',
    words: [
      'Africa', 'Agent', 'Air', 'Alien', 'Alps', 'Amazon', 'Ambulance', 'America', 'Angel', 'Antarctica',
      'Apple', 'Arm', 'Atlantis', 'Australia', 'Aztec', 'Back', 'Ball', 'Band', 'Bank', 'Bar',
      'Bark', 'Bat', 'Battery', 'Beach', 'Bear', 'Beat', 'Bed', 'Beijing', 'Bell', 'Belt',
      'Berlin', 'Bermuda', 'Berry', 'Bill', 'Block', 'Board', 'Bolt', 'Bomb', 'Bond', 'Boom',
      'Boot', 'Bottle', 'Bow', 'Box', 'Bridge', 'Brush', 'Buck', 'Bug', 'Button', 'Calf',
      'Canada', 'Cap', 'Capital', 'Car', 'Card', 'Carrot', 'Casino', 'Castle', 'Cat', 'Cell',
      'Centaur', 'Center', 'Chair', 'Change', 'Charge', 'Check', 'Chest', 'Chick', 'China', 'Chocolate',
      'Church', 'Circle', 'Cliff', 'Cloak', 'Club', 'Code', 'Cold', 'Comic', 'Compound', 'Concert',
      'Conductor', 'Contract', 'Cook', 'Copper', 'Cotton', 'Court', 'Cover', 'Crane', 'Crash', 'Cricket',
      'Cross', 'Crown', 'Cycle', 'Czech', 'Dance', 'Date', 'Day', 'Death', 'Deck', 'Degree',
      'Diamond', 'Dice', 'Dinosaur', 'Disease', 'Doctor', 'Dog', 'Draft', 'Dragon', 'Dress', 'Dresser',
      'Drill', 'Drop', 'Duck', 'Dwarf', 'Eagle', 'Egypt', 'Embassy', 'Engine', 'England', 'Europe',
      'Eye', 'Face', 'Fair', 'Fall', 'Fan', 'Fence', 'Field', 'Fighter', 'Figure', 'File',
      'Film', 'Fire', 'Fish', 'Flute', 'Fly', 'Foot', 'Force', 'Forest', 'Fork', 'France',
      'Game', 'Gas', 'Genius', 'Germany', 'Ghost', 'Giant', 'Glass', 'Glove', 'Gold', 'Grace',
      'Greece', 'Green', 'Ground', 'Ham', 'Hand', 'Hawk', 'Head', 'Heart', 'Helicopter', 'Himalayas',
      'Hole', 'Hollywood', 'Honey', 'Hood', 'Hook', 'Horn', 'Horse', 'Hospital', 'Hotel', 'Ice',
      'Ice Cream', 'India', 'Iron', 'Ivory', 'Jack', 'Jam', 'Jet', 'Jupiter', 'Kangaroo', 'Ketchup',
      'Key', 'Kid', 'King', 'Kiss', 'Kitchen', 'Kite', 'Knife', 'Knight', 'Lab', 'Lap',
      'Laser', 'Lawyer', 'Lead', 'Lemon', 'Leopard', 'Letter', 'Life', 'Light', 'Limb', 'Line',
      'Link', 'Lion', 'Litter', 'Lock', 'Log', 'London', 'Luck', 'Mail', 'Mammoth', 'Maple',
      'Marble', 'March', 'Mass', 'Match', 'Mercury', 'Mexico', 'Microscope', 'Millionaire', 'Mine', 'Mint',
      'Mist', 'Model', 'Mole', 'Moon', 'Moscow', 'Mount', 'Mouse', 'Mouth', 'Mug', 'Nail',
      'Needle', 'Net', 'New York', 'Night', 'Ninja', 'Note', 'Novel', 'Nurse', 'Nut', 'Octopus',
      'Oil', 'Olympus', 'Opera', 'Orange', 'Organ', 'Palm', 'Pan', 'Pants', 'Paper', 'Parachute',
      'Park', 'Part', 'Pass', 'Paste', 'Penguin', 'Phoenix', 'Piano', 'Picnic', 'Pilot', 'Pin',
      'Pipe', 'Pirate', 'Pit', 'Pitch', 'Plane', 'Plastic', 'Plate', 'Platypus', 'Play', 'Plot',
      'Point', 'Poison', 'Pole', 'Police', 'Pool', 'Port', 'Post', 'Princess', 'Pumpkin', 'Punch',
      'Pupil', 'Pyramid', 'Queen', 'Rabbit', 'Racket', 'Ray', 'Revolution', 'Ring', 'Robin', 'Robot',
      'Rock', 'Rome', 'Root', 'Rose', 'Roulette', 'Round', 'Row', 'Ruler', 'Satellite', 'Saturn',
      'Scale', 'School', 'Scientist', 'Scorpion', 'Screen', 'Scuba Diver', 'Seal', 'Server', 'Shadow', 'Shakespeare',
      'Shark', 'Ship', 'Shoe', 'Shop', 'Shot', 'Sink', 'Skyscraper', 'Slip', 'Slipper', 'Smuggler',
      'Snow', 'Snowman', 'Sock', 'Soldier', 'Soul', 'Sound', 'Space', 'Spell', 'Spider', 'Spike',
      'Spine', 'Spot', 'Spring', 'Spy', 'Square', 'Stadium', 'Staff', 'Star', 'State', 'Stick',
      'Stock', 'Strike', 'String', 'Sub', 'Suit', 'Superhero', 'Swing', 'Switch', 'Table', 'Tablet',
      'Tag', 'Tail', 'Tap', 'Teacher', 'Teeth', 'Temple', 'Theater', 'Thief', 'Thumb', 'Tick',
      'Tie', 'Time', 'Tokyo', 'Tooth', 'Torch', 'Tower', 'Track', 'Train', 'Triangle', 'Trip',
      'Trunk', 'Tube', 'Turkey', 'Undertaker', 'Unicorn', 'Vacuum', 'Van', 'Vet', 'Wake', 'Wall',
      'War', 'Washer', 'Washington', 'Watch', 'Water', 'Wave', 'Web', 'Well', 'Whale', 'Whip',
      'Wind', 'Wine', 'Witch', 'Wizard', 'Wolf', 'Wood', 'Worm', 'Yard', 'Zebra'
    ]
  }
];

export const defaultStyles = {
  spymaster: {
    plain: 'Give a concise clue and count. Avoid risky associations. Output only JSON.',
    creative: 'Give a creative clue and count with a short rationale. Output only JSON.',
    risky: 'Give a bold clue with higher risk tolerance. Output only JSON.'
  },
  guesser: {
    plain: 'Guess cautiously. Prefer high-confidence picks. Output only JSON.',
    creative: 'Guess with a bit of creativity, but be safe. Output only JSON.',
    risky: 'Guess aggressively and try multi-guess turns. Output only JSON.'
  }
};
