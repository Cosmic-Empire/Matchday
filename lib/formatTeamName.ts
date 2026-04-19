export const formatTeamName = (name: string) => {
  const TEAM_ALIASES: Record<string, string> = {
    // Premier League
    "Manchester City FC": "Man City",
    "Manchester United FC": "Man United",
    "Arsenal FC": "Arsenal",
    "Chelsea FC": "Chelsea",
    "Liverpool FC": "Liverpool",
    "Tottenham Hotspur FC": "Spurs",
    "Newcastle United FC": "Newcastle",
    "Brighton & Hove Albion FC": "Brighton",
    "West Ham United FC": "West Ham",
    "Aston Villa FC": "Aston Villa",
    "AFC Bournemouth": "Bournemouth",
    "Wolverhampton Wanderers FC": "Wolves",

    // La Liga
    "Real Madrid CF": "Real Madrid",
    "FC Barcelona": "Barcelona",
    "Club Atlético de Madrid": "Atletico",
    "Sevilla FC": "Sevilla",
    "Real Betis Balompié": "Real Betis",
    "Villarreal CF": "Villarreal",
    "Real Sociedad de Fútbol": "Real Sociedad",
    "Athletic Club": "Athletic Club",
    "RCD Espanyol de Barcelona": "Espanyol",
    "RC Celta de Vigo": "Celta Vigo",
    "CA Osasuna": "Osasuna",

    // Bundesliga
    "FC Bayern München": "FC Bayern",
    "Borussia Dortmund": "Dortmund",
    "RB Leipzig": "RB Leipzig",
    "Bayer 04 Leverkusen": "Leverkusen",
    "Eintracht Frankfurt": "Frankfurt",
    "VfL Wolfsburg": "Wolfsburg",
    "Borussia Mönchengladbach": "Gladbach",
    "Vfb Stuttgart": "Stuttgart",
    "TSG 1899 Hoffenheim": "Hoffenheim",
    "SC Freiburg": "Freiburg",
    "1. FSV Mainz 05": "Mainz",
    "FC Augsburg": "Augsburg",


    // Serie A
    "Juventus FC": "Juventus",
    "FC Internazionale Milano": "Inter",
    "AC Milan": "AC Milan",
    "AS Roma": "Roma",
    "SS Lazio": "Lazio",
    "SSC Napoli": "Napoli",
    "Atalanta BC": "Atalanta",
    "ACF Fiorentina": "Fiorentina",
    "Como 1907": "Como",
    "Bologna FC 1909": "Bologna",
    "Udinese Calcio": "Udinese",

    // Ligue 1
    "Paris Saint-Germain FC": "PSG",
    "Olympique de Marseille": "Marseille",
    "AS Monaco FC": "Monaco",
    "LOSC Lille": "Lille",
    "OGC Nice": "Nice",
    "Racing Club de Lens": "Lens",
    "Stade Rennais FC 1901": "Rennes",
    "Montpellier HSC": "Montpellier",
    "FC Nantes": "Nantes",
    "Lille OSC": "Lille",
    "Stade de Reims": "Reims",
    "RC Strasbourg Alsace": "Strasbourg",
    "FC Lorient": "Lorient",


    // Portugal
    "FC Porto": "Porto",
    "SL Benfica": "Benfica",
    "Sporting Clube de Portugal": "Sporting",

    // Netherlands
    "AFC Ajax": "Ajax",
    "PSV Eindhoven": "PSV",
    "Feyenoord Rotterdam": "Feyenoord",

    // Scotland
    "Celtic FC": "Celtic",
    "Rangers FC": "Rangers",
  };

  return (
    TEAM_ALIASES[name] ||
    name
      .replace(/ Football Club/g, '')
      .replace(/ FC$/g, '')
      .replace(/ CF$/g, '')
      .replace(/ AFC$/g, '')
      .replace(/ SC$/g, '')
      .replace(/ SSC/g, '')
      .replace(/ AC$/g, '')
      .replace(/ BC$/g, '')
      .replace(/ de Fútbol/g, '')
      .replace(/ Balompié/g, '')
      .trim()
  );
};