// Shared MCU timeline data — chronological (in-story) order, movies + Disney+
// series interleaved. Note: exact placement of overlapping post-Blip stories
// (roughly 2023-2025 in-story) is approximate — even Marvel's own official
// guides differ on it. Miles Morales' animated Spider-Verse films are a
// separate Sony continuity, not MCU canon, and are intentionally excluded.
const MCU_TIMELINE = [
  {type:"movie", title:"Captain America: The First Avenger", year:2011, era:"World War II", blurb:"Scrawny Steve Rogers becomes a super-soldier and takes the fight to HYDRA in WWII."},

  {type:"movie", title:"Captain Marvel", year:2019, era:"The 1990s", blurb:"Carol Danvers discovers her true power — and just how far Kree deception really goes."},

  {type:"movie", title:"Iron Man", year:2008, era:"Phase One: A Hero Emerges", blurb:"Tony Stark builds his first suit of armor in a cave — \"with a box of scraps\" — and a genre is reborn."},
  {type:"movie", title:"Iron Man 2", year:2010, era:"Phase One: A Hero Emerges", blurb:"Stark battles palladium poisoning and a vengeful rival — while S.H.I.E.L.D. quietly builds something bigger."},
  {type:"movie", title:"The Incredible Hulk", year:2008, era:"Phase One: A Hero Emerges", blurb:"Bruce Banner runs from the military, and his own rage, after a gamma experiment goes wrong."},
  {type:"movie", title:"Thor", year:2011, era:"Phase One: A Hero Emerges", blurb:"An arrogant god of thunder is cast out of Asgard and learns humility on Earth."},
  {type:"movie", title:"The Avengers", year:2012, era:"Phase One: A Hero Emerges", blurb:"Loki brings an alien army to Earth, and Earth's Mightiest Heroes assemble for the first time."},

  {type:"movie", title:"Thor: The Dark World", year:2013, era:"Phase Two: The World Expands", blurb:"Ancient Dark Elves return, and Thor teams up with Loki to save the Nine Realms."},
  {type:"movie", title:"Iron Man 3", year:2013, era:"Phase Two: The World Expands", blurb:"Stark rebuilds himself — suits and psyche — after the Mandarin brings the fight to his front door."},
  {type:"movie", title:"Captain America: The Winter Soldier", year:2014, era:"Phase Two: The World Expands", blurb:"Cap uncovers HYDRA hiding inside S.H.I.E.L.D. — and faces a ghost from his past."},
  {type:"movie", title:"Guardians of the Galaxy", year:2014, era:"Phase Two: The World Expands", blurb:"A ragtag crew of misfits and a talking raccoon save the galaxy to an awesome soundtrack."},
  {type:"movie", title:"Guardians of the Galaxy Vol. 2", year:2017, era:"Phase Two: The World Expands", blurb:"Star-Lord finally meets his mysterious father. He is, unfortunately, a planet."},
  {type:"movie", title:"Avengers: Age of Ultron", year:2015, era:"Phase Two: The World Expands", blurb:"Tony Stark's AI peacekeeper goes rogue with plans to \"save\" humanity by ending it."},
  {type:"movie", title:"Ant-Man", year:2015, era:"Phase Two: The World Expands", blurb:"A cat burglar dons a shrinking suit and pulls off the ultimate heist."},

  {type:"movie", title:"Captain America: Civil War", year:2016, era:"Phase Three: Infinity Rising", blurb:"The Avengers split over accountability, and Cap and Stark come to blows."},
  {type:"movie", title:"Black Widow", year:2021, era:"Phase Three: Infinity Rising", blurb:"Natasha Romanoff confronts her Red Room past — and the family she never chose. Set right after Civil War."},
  {type:"movie", title:"Black Panther", year:2018, era:"Phase Three: Infinity Rising", blurb:"T'Challa returns home to Wakanda to claim the throne — and defend a hidden nation."},
  {type:"movie", title:"Spider-Man: Homecoming", year:2017, era:"Phase Three: Infinity Rising", blurb:"Peter Parker juggles homework and web-slinging under Stark's watchful eye."},
  {type:"movie", title:"Doctor Strange", year:2016, era:"Phase Three: Infinity Rising", blurb:"A brilliant, arrogant surgeon loses the use of his hands — and finds magic instead."},
  {type:"movie", title:"Thor: Ragnarok", year:2017, era:"Phase Three: Infinity Rising", blurb:"Thor loses his hammer, gains a gladiator arena, and gets a very good haircut."},
  {type:"movie", title:"Avengers: Infinity War", year:2018, era:"Phase Three: Infinity Rising", blurb:"Thanos hunts six Infinity Stones, and half the universe pays the price."},
  {type:"movie", title:"Ant-Man and the Wasp", year:2018, era:"Phase Three: Infinity Rising", blurb:"Scott Lang teams with Hope van Dyne on a rescue mission into the Quantum Realm — right as the snap hits."},
  {type:"movie", title:"Avengers: Endgame", year:2019, era:"Phase Three: Infinity Rising", blurb:"The survivors mount a time heist for the fight of their lives."},
  {type:"movie", title:"Spider-Man: Far From Home", year:2019, era:"Phase Three: Infinity Rising", blurb:"Peter just wants a normal European vacation. It does not stay normal."},

  {type:"series", title:"WandaVision", year:2021, era:"The Blip & Its Aftermath", blurb:"Wanda Maximoff builds a too-perfect sitcom life in Westview — and the cracks start to show."},
  {type:"series", title:"The Falcon and the Winter Soldier", year:2021, era:"The Blip & Its Aftermath", blurb:"Sam Wilson and Bucky Barnes navigate a world in mourning, a new Captain America, and old wounds."},
  {type:"series", title:"Loki", year:2021, era:"The Blip & Its Aftermath", blurb:"A variant of the God of Mischief gets recruited by the time-policing TVA — and unravels the multiverse."},
  {type:"movie", title:"Shang-Chi and the Legend of the Ten Rings", year:2021, era:"The Blip & Its Aftermath", blurb:"A man trained as an assassin confronts his father's legacy and the power of the Ten Rings."},
  {type:"series", title:"What If...?", year:2021, era:"The Blip & Its Aftermath", blurb:"The Watcher narrates a multiverse of alternate MCU stories — animated and delightfully unhinged."},
  {type:"movie", title:"Eternals", year:2021, era:"The Blip & Its Aftermath", blurb:"Ancient immortal beings reveal themselves to protect Earth from a threat older than the MCU itself."},
  {type:"series", title:"Hawkeye", year:2021, era:"The Blip & Its Aftermath", blurb:"Clint Barton just wants to get home for Christmas. Kate Bishop has other plans."},
  {type:"movie", title:"Spider-Man: No Way Home", year:2021, era:"The Blip & Its Aftermath", blurb:"A spell gone wrong tears open the multiverse — and brings some very familiar faces home."},
  {type:"series", title:"Moon Knight", year:2022, era:"The Blip & Its Aftermath", blurb:"A mild-mannered gift-shop worker discovers he's sharing a body — and an Egyptian god — with a mercenary."},
  {type:"series", title:"Ms. Marvel", year:2022, era:"The Blip & Its Aftermath", blurb:"Jersey City teen Kamala Khan gets bangle-powered cosmic abilities and becomes her own hero."},
  {type:"movie", title:"Doctor Strange in the Multiverse of Madness", year:2022, era:"The Blip & Its Aftermath", blurb:"Strange chases a dimension-hopping teenager through a multiverse gone mad."},
  {type:"movie", title:"Thor: Love and Thunder", year:2022, era:"The Blip & Its Aftermath", blurb:"Thor teams up with ex-girlfriend-turned-Mighty-Thor Jane Foster against a god-butcher."},
  {type:"series", title:"She-Hulk: Attorney at Law", year:2022, era:"The Blip & Its Aftermath", blurb:"Lawyer Jennifer Walters inherits her cousin Bruce Banner's gamma abilities — and zero patience for superhero nonsense."},
  {type:"movie", title:"Black Panther: Wakanda Forever", year:2022, era:"The Blip & Its Aftermath", blurb:"Wakanda mourns and rises again against a new threat rising from the sea."},

  {type:"movie", title:"Ant-Man and the Wasp: Quantumania", year:2023, era:"The Multiverse Saga Continues", blurb:"The Lang-van Dyne family gets stranded in the Quantum Realm and meets Kang the Conqueror."},
  {type:"series", title:"Secret Invasion", year:2023, era:"The Multiverse Saga Continues", blurb:"Nick Fury faces a decades-long Skrull infiltration of Earth."},
  {type:"movie", title:"Guardians of the Galaxy Vol. 3", year:2023, era:"The Multiverse Saga Continues", blurb:"The Guardians fight to save Rocket's life — and confront the High Evolutionary."},
  {type:"series", title:"Loki (Season 2)", year:2023, era:"The Multiverse Saga Continues", blurb:"Loki fights to hold the Sacred Timeline together as the TVA itself starts to fracture."},
  {type:"movie", title:"The Marvels", year:2023, era:"The Multiverse Saga Continues", blurb:"Carol Danvers, Kamala Khan, and Monica Rambeau get their powers tangled together."},
  {type:"series", title:"Echo", year:2024, era:"The Multiverse Saga Continues", blurb:"Maya Lopez returns home to confront her family's ties to the Kingpin's criminal empire."},
  {type:"series", title:"Agatha All Along", year:2024, era:"The Multiverse Saga Continues", blurb:"Agatha Harkness cons a coven into walking the Witches' Road with her — deals with the devil included."},
  {type:"movie", title:"Deadpool & Wolverine", year:2024, era:"The Multiverse Saga Continues", blurb:"The Merc with a Mouth drags a reluctant Wolverine into a multiversal buddy comedy."},
  {type:"series", title:"Daredevil: Born Again", year:2025, era:"The Multiverse Saga Continues", blurb:"Matt Murdock and Wilson Fisk collide again as lawyer and mayor — old rivalries, new stakes."},
  {type:"movie", title:"Captain America: Brave New World", year:2025, era:"The Multiverse Saga Continues", blurb:"Sam Wilson steps fully into the shield amid a new global crisis."},
  {type:"series", title:"Ironheart", year:2025, era:"The Multiverse Saga Continues", blurb:"Genius engineer Riri Williams builds her own armor — and gets tangled up with a very literal devil."},
  {type:"movie", title:"Thunderbolts*", year:2025, era:"The Multiverse Saga Continues", blurb:"A team of morally gray antiheroes gets thrown together on a mission gone sideways."},
  {type:"movie", title:"The Fantastic Four: First Steps", year:2025, era:"The Multiverse Saga Continues", blurb:"Marvel's First Family finally arrives in the MCU with a retro-future flair."},

  {type:"series", title:"Wonder Man", year:2026, era:"Coming Soon", blurb:"Stuntman-turned-hero Simon Williams chases his big break in a Hollywood that's stranger than it looks.", upcoming:true},
  {type:"movie", title:"Avengers: Doomsday", year:2026, era:"Coming Soon", blurb:"The next great Avengers team-up, with Victor von Doom entering the saga.", upcoming:true},
  {type:"movie", title:"Spider-Man: Brand New Day", year:2026, era:"Coming Soon", blurb:"Peter Parker's next chapter swings into theaters.", upcoming:true},
  {type:"movie", title:"Avengers: Secret Wars", year:2027, era:"Coming Soon", blurb:"The Multiverse Saga's finale — worlds collide.", upcoming:true},
];

const CHARACTERS = [
  {name:"Tony Stark", alt:"Iron Man", actor:"Robert Downey Jr.", blurb:"Genius. Billionaire. Playboy. Philanthropist. Built the armor that started it all."},
  {name:"Steve Rogers", alt:"Captain America", actor:"Chris Evans", blurb:"A scrawny kid from Brooklyn who never learned how to lose — or back down."},
  {name:"Thor Odinson", alt:"God of Thunder", actor:"Chris Hemsworth", blurb:"Asgard's exiled prince, wielder of Mjolnir, worthy of the title \"strongest Avenger.\""},
  {name:"Natasha Romanoff", alt:"Black Widow", actor:"Scarlett Johansson", blurb:"Ex-KGB assassin turned S.H.I.E.L.D. agent turned founding Avenger."},
  {name:"Bruce Banner", alt:"The Hulk", actor:"Mark Ruffalo", blurb:"Brilliant scientist with an anger management problem the size of a building."},
  {name:"Clint Barton", alt:"Hawkeye", actor:"Jeremy Renner", blurb:"No powers, no armor — just a bow, an arrow, and perfect aim."},
  {name:"Peter Parker", alt:"Spider-Man", actor:"Tom Holland", blurb:"Your friendly neighborhood web-slinger, still figuring out the whole \"hero\" thing."},
  {name:"T'Challa", alt:"Black Panther", actor:"Chadwick Boseman", blurb:"King of Wakanda, protector of a nation the world never knew existed."},
  {name:"Carol Danvers", alt:"Captain Marvel", actor:"Brie Larson", blurb:"Ex-Air Force pilot turned one of the most powerful beings in the universe."},
  {name:"Stephen Strange", alt:"Doctor Strange", actor:"Benedict Cumberbatch", blurb:"Former surgeon, current Sorcerer Supreme, protector of reality itself."},
  {name:"Wanda Maximoff", alt:"Scarlet Witch", actor:"Elizabeth Olsen", blurb:"Chaos magic given human form — grief made her one of the most powerful beings alive."},
  {name:"Peter Quill", alt:"Star-Lord", actor:"Chris Pratt", blurb:"Half-human, half-Celestial, all mixtape. Leader of the galaxy's most dysfunctional family."},
];
