# -*- coding: utf-8 -*-
"""
gen-mol3d.py — 用 RDKit 为中学常见分子生成 3D 构象（ETKDG + MMFF 优化）
输出: ai-cases/molecule3d/data.js  (window.MOL3D_LIST = [...])
离线可用，不依赖 PubChem。
"""
import json, io, os
from rdkit import Chem
from rdkit.Chem import AllChem

OUT = os.path.join(os.path.dirname(__file__), '..', 'ai-cases', 'molecule3d', 'data.js')

# (id, 名称, 化学式(展示), SMILES, 分类, 一句话说明)
MOLS = [
    ('h2o',   '水 H2O',        'H₂O',   'O',                '无机·小分子', 'V 形分子的代表：键角 104.5°，氧上两对孤对电子决定了水的极性和氢键。'),
    ('co2',   '二氧化碳 CO2',   'CO₂',   'O=C=O',            '无机·小分子', '直线形非极性分子：碳氧双键，两个 π 键，中心原子 sp 杂化。'),
    ('nh3',   '氨 NH3',         'NH₃',   'N',                '无机·小分子', '三角锥形：氮上有一对孤对电子，是喷泉实验的主角。'),
    ('ch4',   '甲烷 CH4',       'CH₄',   'C',                '无机·小分子', '正四面体的标准样板：键角 109°28′，sp³ 杂化。'),
    ('hcl',   '氯化氢 HCl',     'HCl',   'Cl',               '无机·小分子', '强极性共价键，溶于水电离出 H⁺ 和 Cl⁻。'),
    ('o2',    '氧气 O2',        'O₂',    'O=O',              '无机·小分子', '双原子分子，含一个 σ 键和两个 π 键（三键级）。'),
    ('n2',    '氮气 N2',        'N₂',    'N#N',              '无机·小分子', '三键键能 946 kJ/mol，常温下极稳定——氮气做保护气的原因。'),
    ('h2',    '氢气 H2',        'H₂',    '[H][H]',           '无机·小分子', '最小的分子，密度最小的气体，还原性实验常用它。'),
    ('co',    '一氧化碳 CO',    'CO',    '[C-]#[O+]',        '无机·小分子', '与血红蛋白结合力是氧气的 200 多倍——煤气中毒的根源。'),
    ('so2',   '二氧化硫 SO2',   'SO₂',   'O=S=O',            '无机·小分子', 'V 形极性分子，能使品红褪色，是形成酸雨的元凶。'),
    ('c2h4',  '乙烯 C2H4',      'C₂H₄',  'C=C',              '有机·烃',     '平面形分子，碳碳双键不能旋转——加聚成聚乙烯的原料。'),
    ('c2h2',  '乙炔 C2H2',      'C₂H₂',  'C#C',              '有机·烃',     '直线形分子，碳碳三键，火焰温度可达 3000 ℃ 以上。'),
    ('c6h6',  '苯 C6H6',        'C₆H₆',  'c1ccccc1',         '有机·烃',     '平面正六边形，六个碳完全等价——大 π 键让「单双键交替」只是书写习惯。'),
    ('c7h8',  '甲苯 C7H8',      'C₇H₈',  'Cc1ccccc1',        '有机·烃',     '苯的同系物：甲基使邻、对位氢更活泼，硝化后得 TNT。'),
    ('ch3oh', '甲醇 CH3OH',     'CH₃OH', 'CO',               '有机·烃的衍生物', '最简单的醇：羟基直接连在碳上，有毒、假酒事故的元凶。'),
    ('c2h5oh','乙醇 C2H5OH',    'C₂H₅OH','CCO',              '有机·烃的衍生物', '羟基去氢氧化成醛——酒驾检测就是利用这个反应。'),
    ('ch3cooh','乙酸 CH3COOH',  'CH₃COOH','CC(=O)O',         '有机·烃的衍生物', '羧基 = 羰基 + 羟基，酸性比碳酸强，能与乙醇酯化。'),
    ('hcho',  '甲醛 HCHO',      'HCHO',  'C=O',              '有机·烃的衍生物', '羰基平面结构，装修污染的主角，能使蛋白质变性。'),
    ('acetone','丙酮 CH3COCH3', 'C₃H₆O', 'CC(=O)C',          '有机·烃的衍生物', '最简单的酮：羰基两端都是碳，不能被银氨溶液氧化。'),
    ('ea',    '乙酸乙酯 C4H8O2','C₄H₈O₂','CCOC(C)=O',        '有机·烃的衍生物', '酯化反应的产物，果香气味——水浴加热、导管不插入液面的原因。'),
    ('c6h5oh','苯酚 C6H5OH',   'C₆H₆O', 'Oc1ccccc1',        '有机·烃的衍生物', '羟基连在苯环上，酸性介于碳酸两级之间，遇 FeCl₃ 显紫色。'),
    ('glc',   '葡萄糖 C6H12O6', 'C₆H₁₂O₆','OCC1OC(O)C(O)C(O)C1O','糖类·生命物质', '环状半缩醛结构，检验方法：银镜反应或与新制氢氧化铜共热。'),
    ('sucrose','蔗糖 C12H22O11','C₁₂H₂₂O₁₁','OCC1OC(OC2OC(CO)C(O)C(O)C2O)C(O)C(O)C1O','糖类·生命物质', '葡萄糖 + 果糖脱水缩合，非还原糖——水解后才能发生银镜反应。'),
    ('vc',    '维生素C C6H8O6', 'C₆H₈O₆','OC[C@H]1OC(O)=C(O)[C@@H](O)[C@H]1O','糖类·生命物质', '含烯二醇结构，容易被氧化——所以能抗氧化、但不能加热太久。'),
    ('asp',   '阿司匹林 C9H8O4','C₉H₈O₄','CC(=O)Oc1ccccc1C(=O)O','药物·拓展',  '乙酰水杨酸：苯环上同时挂了酯基和羧基，水解产物之一是水杨酸。'),
    ('caf',   '咖啡因 C8H10N4O2','C₈H₁₀N₄O₂','Cn1cnc2c1c(=O)n(C)c(=O)n2C','药物·拓展', '生物碱：四个氮的稠环结构，提神靠阻断腺苷受体。'),
]

# 3Dmol 仓库自带的生物大分子（MIT，见 THIRD_PARTY_NOTICES）——本地 structures/ 内嵌，彻底离线
PDBS = [
    ('dna',  'DNA 双螺旋',   '—',  'structures/dna.pdb', '生物大分子', '双螺旋结构：两条链靠碱基互补配对（A-T、G-C）拧成螺旋，每一个碱基对就是一段「拉链齿」。'),
    ('heme', '血红素（亚铁原卟啉）', 'C₃₄H₃₂FeN₄O₄', 'structures/heme.pdb', '生物大分子', '血红蛋白的活性中心：中心一个 Fe²⁺ 负责结合氧气——缺铁性贫血的「铁」就在这里。'),
    ('c60',  '足球烯 C60',   'C₆₀', 'structures/c60.sdf', '材料结构', '12 个五边形 + 20 个六边形拼成的球——碳的第三种同素异形体。'),
]

rows = []
fails = []
for mid, name, formula, smi, cat, desc in MOLS:
    m = Chem.MolFromSmiles(smi)
    if m is None:
        fails.append(mid); continue
    m = Chem.AddHs(m)
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    if AllChem.EmbedMolecule(m, params) != 0:
        fails.append(mid); continue
    try:
        AllChem.MMFFOptimizeMolecule(m, maxIters=500)
    except Exception:
        pass
    sdf = io.StringIO()
    w = Chem.SDWriter(sdf)
    w.write(m)
    w.close()
    # 规范化 MOL 头部为标准 4 行（title 空 / program / comment 空 / counts）
    # 避免 3Dmol 解析器按固定行号读时错位
    lines = sdf.getvalue().strip().split('\n')
    vi = next(i for i, l in enumerate(lines) if 'V2000' in l)
    counts_i = vi - 1
    if counts_i == 1:
        lines = [''] + lines            # strip 吃掉了 title 空行，补回
    elif counts_i > 3:
        lines = ['', '     RDKit          3D', ''] + lines[counts_i:]  # 多余头，截掉
    sdf_str = '\n'.join(lines)
    rows.append({
        'id': mid, 'name': name, 'f': formula, 'cat': cat, 'd': desc,
        'smi': smi, 'sdf': sdf_str
    })
    print('ok', mid, Chem.rdMolDescriptors.CalcMolFormula(m), len(rows))

BASE = os.path.dirname(os.path.abspath(__file__))
for pid, name, formula, path, cat, desc in PDBS:
    p = os.path.join(BASE, '..', 'ai-cases', 'molecule3d', path)
    data = open(p, encoding='utf-8', errors='ignore').read().strip()
    rows.append({'id': pid, 'name': name, 'f': formula, 'cat': cat, 'd': desc,
                 'data': data, 'fmt': 'pdb' if data.startswith(('HEADER', 'COMPND', 'ATOM', 'REMARK')) else 'sdf'})
    print('embedded', pid, len(data))

if fails:
    print('FAILED:', fails)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fp:
    fp.write('/* 由 scripts/gen-mol3d.py 生成 · 3D 构象由 RDKit ETKDG+MMFF 生成 · 请勿手工编辑 */\n')
    fp.write('window.MOL3D_LIST = ')
    fp.write(json.dumps(rows, ensure_ascii=False, separators=(',', ':')))
    fp.write(';\n')
print('written', OUT, os.path.getsize(OUT))
