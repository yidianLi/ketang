/* 化学方程式配平 · 内置例题 */
(function (root) {
  'use strict';
  root.EQUATIONS = [
    { eq: 'Fe + O2 -> Fe3O4', name: '铁在氧气中燃烧' },
    { eq: 'KClO3 -> KCl + O2', name: '氯酸钾受热分解' },
    { eq: 'KMnO4 -> K2MnO4 + MnO2 + O2', name: '高锰酸钾制氧气' },
    { eq: 'H2O -> H2 + O2', name: '电解水' },
    { eq: 'Zn + HCl -> ZnCl2 + H2', name: '锌与稀盐酸' },
    { eq: 'NaOH + H2SO4 -> Na2SO4 + H2O', name: '中和反应' },
    { eq: 'Ca(OH)2 + HCl -> CaCl2 + H2O', name: '熟石灰与盐酸' },
    { eq: 'CH4 + O2 -> CO2 + H2O', name: '甲烷燃烧' },
    { eq: 'C2H5OH + O2 -> CO2 + H2O', name: '酒精燃烧' },
    { eq: 'Fe2O3 + CO -> Fe + CO2', name: '高炉炼铁' },
    { eq: 'Al + CuSO4 -> Al2(SO4)3 + Cu', name: '铝置换铜' },
    { eq: 'AgNO3 + NaCl -> AgCl + NaNO3', name: '沉淀反应' },
    { eq: 'C3H8 + O2 -> CO2 + H2O', name: '丙烷燃烧' },
    { eq: 'NH3 + O2 -> NO + H2O', name: '氨的催化氧化' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
