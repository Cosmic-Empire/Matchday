export const formatTeamName = (name: string) => {
  const TEAM_ALIASES: Record<string, string> = {
    "Manchester City FC": "Man City",
    "Manchester United FC": "Man United",
    "Paris Saint-Germain FC": "PSG",
    "FC Bayern München": "Bayern",
    "Borussia Dortmund": "Dortmund",
  };

  return (
    TEAM_ALIASES[name] ||
    name
      .replace(/ Football Club/g, '')
      .replace(/ FC$/g, '')
      .replace(/ CF$/g, '')
      .replace(/ AFC$/g, '')
      .replace(/ SSC/g, '')
      .trim()
  );
};