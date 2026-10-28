// Fully fictional UI fixtures for issue #1; never interpret these as persisted user data.
export const demoHabits = [
  { id: "walk", emoji: "🚶", title: "Een frisse wandeling", detail: "30 minuten naar buiten", category: "Beweging", done: 3, target: 4, color: "#cfe9db" },
  { id: "sleep", emoji: "🌙", title: "Rustig naar bed", detail: "Scherm uit om 22.00 uur", category: "Slaap", done: 4, target: 5, color: "#e4dff1" },
  { id: "eat", emoji: "🥗", title: "Meer groente eten", detail: "Groente bij de lunch", category: "Voeding", done: 2, target: 4, color: "#f5ead2" },
] as const;

export const demoGoals = [
  { id: "condition", title: "Meer energie en conditie", category: "Beweging", description: "Ik wil me fitter voelen en makkelijker bewegen in het dagelijks leven.", target: "Vaker naar buiten", progress: 65, emoji: "🌿" },
  { id: "sleep", title: "Beter en rustiger slapen", category: "Slaap", description: "Ik wil uitgerust wakker worden en een fijn avondritme opbouwen.", target: "Vijf rustige avonden", progress: 80, emoji: "🌙" },
  { id: "nutrition", title: "Bewuster eten", category: "Voeding", description: "Ik wil aandachtiger kiezen wat goed voelt en bij mij past.", target: "Groente bij lunch", progress: 50, emoji: "🥕" },
] as const;
