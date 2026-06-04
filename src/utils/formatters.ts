export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value / 100);
};

export const formatMonth = (mes: number) => {
  const years = Math.floor(mes / 12);
  const months = mes % 12;
  if (years > 0 && months > 0) return `${years}a ${months}m`;
  if (years > 0) return `${years} anos`;
  return `${months} meses`;
};

export const formatMonthsToYearsAndMonths = (totalMonths: number) => {
  const years = Math.floor(totalMonths / 12);
  const months = Math.round(totalMonths % 12);
  if (years === 0) return `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}`;
  
  const yearStr = years === 1 ? '1 ano' : `${years} anos`;
  if (months === 0) return yearStr;
  
  const monthStr = months === 1 ? '1 mês' : `${months} meses`;
  return `${yearStr} e ${monthStr}`;
};
