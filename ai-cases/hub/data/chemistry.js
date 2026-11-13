/* ============================================================
   化学学科目录数据
   ------------------------------------------------------------
   路径相对于 ai-cases/chemistrylearn/index.html
   分子 / 晶体演示用 molecule.html 的查询参数直接定位：
     ?m=<分子 id>&mode=ball|fill      分子模式
     ?tab=crystal&c=<晶体 id>          晶体模式
   fq : 考频（%），sc : 平均分值（分）——近五年考卷权重整理的近似参考值
   tag: key 重点学 / hot 高频 / gap 查漏补缺
   ============================================================ */

window.SUBJECT = {
  "key": "chemistry",
  "name": "化学",
  "title": "中学化学可视化互动学习",
  "subtitle": "先看结构怎么搭，再写对应的式子——初三到高二按年级挑演示，高中段还有 25 门 3D 实验课（高炉炼铁、氯碱工业、侯氏制碱……），跟着步骤走一遍工业流程。",
  "grades": [
    {
      "id": "g9",
      "label": "初三",
      "hint": "中考根基",
      "items": [
        {
          "k": "mol3d",
          "group": "分子与结构",
          "t": "分子 3D 实验室 · 29 个结构",
          "f": "../molecule3d/index.html",
          "src": "3Dmol.js（BSD-3）+ RDKit",
          "fq": 14,
          "sc": 5,
          "tag": "hot",
          "d": "水和 CO₂、乙醇、乙酸、葡萄糖、DNA 双螺旋……29 个结构全部内嵌，断网也能转。球棍 / 空间填充 / 线框随手切，「甲烷是正四面体」转一圈比背十遍都牢。"
        },
        {
          "k": "water",
          "group": "物质的构成",
          "t": "水分子 H₂O",
          "f": "../../molecule.html?m=water",
          "src": "本站原创",
          "fq": 10,
          "sc": 4,
          "tag": "gap",
          "d": "一个水分子是 2 个氢 + 1 个氧。为什么它是折线形而不是直线形？把模型转一圈，看看两个氢是不是对称地挂在氧两侧。"
        },
        {
          "k": "co2",
          "t": "二氧化碳 CO₂",
          "f": "../../molecule.html?m=carbon-dioxide",
          "src": "本站原创",
          "fq": 8,
          "sc": 4,
          "tag": "gap",
          "d": "同样三个原子，CO₂ 却是直线形。碳和氧之间画了两根「棍」，这两根棍表示的是两对共用电子。"
        },
        {
          "k": "methane",
          "t": "甲烷 CH₄",
          "f": "../../molecule.html?m=methane",
          "src": "本站原创",
          "fq": 8,
          "sc": 4,
          "tag": "gap",
          "d": "纸上常画成十字形，真实结构却是正四面体。四个氢为什么不在同一个平面上？"
        },
        {
          "k": "oxygen",
          "t": "氧气 O₂（单质分子）",
          "f": "../../molecule.html?m=oxygen",
          "src": "本站原创",
          "fq": 9,
          "sc": 4,
          "tag": "gap",
          "d": "氧气分子由两个氧原子构成。单质、化合物、混合物——分子模型能帮你看清「一个分子里有几个原子」。"
        }
      ]
    },
    {
      "id": "g10",
      "label": "高一",
      "hint": "稳步提升",
      "items": [
        {
          "k": "ammonia",
          "group": "化学键与分子构型",
          "t": "氨分子 NH₃（三角锥）",
          "f": "../../molecule.html?m=ammonia",
          "src": "本站原创",
          "fq": 12,
          "sc": 6,
          "tag": "hot",
          "d": "氨分子是三角锥形，键角约 107°，比甲烷的 109.5° 小一点。少了一对成键电子，形状就塌下来一角。"
        },
        {
          "k": "fill",
          "t": "空间填充模型",
          "f": "../../molecule.html?m=water&mode=fill",
          "src": "本站原创",
          "fq": 6,
          "sc": 4,
          "tag": "gap",
          "d": "球棍模型看连接关系，空间填充模型看真实大小。同一个水分子，两种画法各能回答什么问题？"
        },
        {
          "k": "ethylene",
          "t": "乙烯 C₂H₄（平面结构）",
          "f": "../../molecule.html?m=ethylene",
          "src": "本站原创",
          "fq": 10,
          "sc": 6,
          "tag": "hot",
          "d": "乙烯的六个原子全在同一平面内，双键不能自由旋转——这是它和乙烷最大的区别。"
        },
        {
          "k": "tj-rate-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "化学反应速率的影响因素",
          "f": "../tongjiang/courses/rate-step.html",
          "src": "铜匠实验室",
          "d": "同样两个反应，为什么有的几秒就完、有的等半天？快慢到底由什么决定？（8 步：认识实验台→浓度→温度→…）"
        },
        {
          "k": "tj-ball-stick-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "搭建球棍模型认识有机化合物分子结构",
          "f": "../tongjiang/courses/ball-stick-step.html",
          "src": "铜匠实验室",
          "d": "分子画在纸上是平的，真实的三维形状到底是什么样？搭一座球棍模型能看出什么？（9 步：零件盒→甲烷→二氯甲烷→…）"
        },
        {
          "k": "tj-chlorine-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "氯气的制备及性质",
          "f": "../tongjiang/courses/chlorine-step.html",
          "src": "铜匠实验室",
          "d": "要一瓶干燥、纯净的氯气，装置里每一段各管什么？少一段会怎样？（9 步：认识装置→为什么加热→为什么要浓盐酸→…）"
        },
        {
          "k": "tj-blast-furnace-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "高炉炼铁",
          "f": "../tongjiang/courses/blast-furnace-step.html",
          "src": "铜匠实验室",
          "d": "一堆矿石从炉顶倒下去，怎么几小时后就变成一股铁水，还越省越好？（8 步：矿石变铁→分层布料→剖开看层→…）"
        },
        {
          "k": "tj-smelting-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "金属冶炼：电解熔融盐 + 铝热",
          "f": "../tongjiang/courses/smelting-step.html",
          "src": "铜匠实验室",
          "d": "为什么铝只能靠电「拆」出来，而铁能被铝「换」出来？（8 步：三处台子→只能电解→剖开槽→…）"
        },
        {
          "k": "tj-coal-gas-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "煤的综合利用：以煤的气化为主线",
          "f": "../tongjiang/courses/coal-gas-step.html",
          "src": "铜匠实验室",
          "d": "煤只能烧吗？怎么把煤变成能造化肥、造甲醇的气？（8 步：为什么气化→供热还是供气→炉子里长什么样→…）"
        },
        {
          "k": "tj-sulfuric-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "接触法制硫酸",
          "f": "../tongjiang/courses/sulfuric-step.html",
          "src": "铜匠实验室",
          "d": "怎样把矿石里的硫，又快、又多、又省、又干净地变成硫酸？（7 步：为什么分五段→为什么先净化→为什么这个温度→…）"
        },
        {
          "k": "tj-cement-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "工业制水泥",
          "f": "../tongjiang/courses/cement-step.html",
          "src": "铜匠实验室",
          "d": "一车石头和土，凭什么磨一磨、烧一烧、再磨一磨，就变成能撑起大坝的水泥？（8 步：看全厂→备生料→预热分解→…）"
        },
        {
          "k": "tj-iron-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "铁及其化合物：铁的价态转化",
          "f": "../tongjiang/courses/iron-step.html",
          "src": "铜匠实验室",
          "d": "同一个铁元素，为什么在试管里一会儿是 +2 价、一会儿是 +3 价，我们凭什么知道它是哪一个？（9 步：认识实验→白色沉淀→隔绝空气→…）"
        },
        {
          "k": "tj-ammonia-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "氨的制备与性质（含喷泉实验）",
          "f": "../tongjiang/courses/ammonia-step.html",
          "src": "铜匠实验室",
          "d": "一瓶氨气，凭什么能把烧杯里的水自己「吸」到瓶子里去？（9 步：整套装置→管口朝哪边→干燥剂选谁→…）"
        },
        {
          "k": "tj-flame-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "焰色试验与原子光谱",
          "f": "../tongjiang/courses/flame-step.html",
          "src": "铜匠实验室",
          "d": "金属在火焰里为什么各有各的颜色，这点颜色凭什么能当成「化验报告」？（8 步：认识实验→洗净铂丝→钠双线→…）"
        },
        {
          "k": "tj-galvanic-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "原电池：单液到双液",
          "f": "../tongjiang/courses/galvanic-step.html",
          "src": "铜匠实验室",
          "d": "同一杯稀硫酸里已经有电流了，为什么还要换成两杯、再加一根盐桥？（9 步：两台装置→接通导线→谁在流→…）"
        },
        {
          "k": "tj-conductivity-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "电解质的电离与溶液导电性、离子反应的实质",
          "f": "../tongjiang/courses/conductivity-step.html",
          "src": "铜匠实验室",
          "d": "干手、湿手都是同一只手，为什么湿了反而容易触电？（9 步：认识台面→干燥与熔融→溶于水→…）"
        },
        {
          "k": "tj-nitric-lab-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "浓、稀硝酸的性质与氮氧化物的转化",
          "f": "../tongjiang/courses/nitric-lab-step.html",
          "src": "铜匠实验室",
          "d": "同样是铜和硝酸，为什么一瓶冒红棕色气体、另一瓶什么颜色都没有？（9 步：整套装置→铜丝插进去→换成稀硝酸→…）"
        },
        {
          "k": "tj-bromine-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "海水提溴：空气吹出法",
          "f": "../tongjiang/courses/bromine-step.html",
          "src": "铜匠实验室",
          "d": "海水里的溴只有 65 mg/L，怎么把它变成一瓶液溴？（7 步：全场→酸化→氧化→…）"
        },
        {
          "k": "tj-sodium-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "金属钠的性质（含钠着火扑救）",
          "f": "../tongjiang/courses/sodium-step.html",
          "src": "铜匠实验室",
          "d": "一块银白色的小金属，为什么必须泡在煤油里，着火时连水都不能浇？（9 步：认识实验→银白变暗→泡在煤油里→…）"
        },
        {
          "k": "tj-sulfur-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "硫、二氧化硫、浓硫酸的性质与不同价态含硫物质的转化",
          "f": "../tongjiang/courses/sulfur-step.html",
          "src": "铜匠实验室",
          "d": "同样是硫，为什么有时它是黄色固体、有时让品红褪成无色、有时又跑进铁粉里？（9 步：整套装置→硫粉 + 铁粉→浓硫酸与铜→…）"
        },
        {
          "k": "tj-hou-soda-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "侯氏制碱",
          "f": "../tongjiang/courses/hou-soda-step.html",
          "src": "铜匠实验室",
          "d": "怎样用食盐和氨造出纯碱，还顺手拿到氮肥？（8 步：从盐到碱→先氨后碳→为什么它自己析出→…）"
        }
      ]
    },
    {
      "id": "g11",
      "label": "高二",
      "hint": "晶体结构",
      "items": [
        {
          "k": "nacl",
          "group": "晶体结构",
          "t": "氯化钠晶体",
          "f": "../../molecule.html?tab=crystal&c=sodium-chloride",
          "src": "本站原创",
          "fq": 16,
          "sc": 8,
          "tag": "key",
          "d": "NaCl 晶体里没有「NaCl 分子」，只有钠离子和氯离子交替排列。每个钠离子周围有几个氯离子？"
        },
        {
          "k": "diamond",
          "t": "金刚石晶体",
          "f": "../../molecule.html?tab=crystal&c=diamond",
          "src": "本站原创",
          "fq": 12,
          "sc": 6,
          "tag": "hot",
          "d": "每个碳原子与 4 个碳相连，构成空间网状结构。这解释了它为什么硬度极高、不导电。"
        },
        {
          "k": "dryice",
          "t": "干冰晶体",
          "f": "../../molecule.html?tab=crystal&c=dry-ice",
          "src": "本站原创",
          "fq": 8,
          "sc": 5,
          "tag": "hot",
          "d": "干冰是分子晶体：CO₂ 分子之间靠分子间作用力堆起来，所以熔点低、易升华。"
        },
        {
          "k": "tj-haber-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "合成氨工业",
          "f": "../tongjiang/courses/haber-step.html",
          "src": "铜匠实验室",
          "d": "怎样把空气里的氮又快、又多、又省地变成氨？（7 步：为什么建厂→为什么净化→为什么加压→…）"
        },
        {
          "k": "tj-titration-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "强酸与强碱的中和滴定",
          "f": "../tongjiang/courses/titration-step.html",
          "src": "铜匠实验室",
          "d": "前面加了 20 多毫升几乎看不出变化，为什么最后半滴颜色就全变了？（9 步：认识滴定装置→润洗与赶气泡→取液与加指示剂→…）"
        },
        {
          "k": "tj-hydrolysis-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "盐类的水解及其应用",
          "f": "../tongjiang/courses/hydrolysis-step.html",
          "src": "铜匠实验室",
          "d": "盐电离出来的离子看上去「既不酸也不碱」，凭什么能让溶液显出酸碱性？（9 步：认识实验→盐的类型→看进去→…）"
        },
        {
          "k": "tj-electrolysis-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "电解原理：电解氯化铜溶液与饱和食盐水",
          "f": "../tongjiang/courses/electrolysis-step.html",
          "src": "铜匠实验室",
          "d": "同一个直流电源，为什么电解氯化铜溶液得到铜和氯气，电解饱和食盐水却得到氢气、氯气和氢氧化钠？（9 步：认识实验→接通电源→通得更久→…）"
        },
        {
          "k": "tj-equilibrium-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "探究影响化学平衡移动的因素",
          "f": "../tongjiang/courses/equilibrium-step.html",
          "src": "铜匠实验室",
          "d": "改变一个条件，凭什么说平衡「往哪边移」？（9 步：认识实验台→铁管加料→铁粉减料→…）"
        },
        {
          "k": "tj-corrosion-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "吸氧腐蚀与暖贴的设计",
          "f": "../tongjiang/courses/corrosion-step.html",
          "src": "铜匠实验室",
          "d": "铁生锈这么慢的事，凭什么能做出一个 45 ℃ 以上的暖贴？又凭什么反过来用它保护铁不生锈？（9 步：台面四站→液柱为什么升→碳粉的角色→…）"
        },
        {
          "k": "tj-chlor-alkali-step",
          "kind": "lab",
          "group": "选择性必修1",
          "t": "氯碱工业",
          "f": "../tongjiang/courses/chlor-alkali-step.html",
          "src": "铜匠实验室",
          "d": "同样的电，怎样换来更多烧碱、更少电耗，又不出事故？（8 步：三样产品→先洗盐→剖开槽→…）"
        }
      ]
    },
    {
      "id": "gtopic",
      "label": "专题",
      "hint": "化学用语",
      "items": [
        {
          "k": "balance",
          "group": "化学用语",
          "t": "化学方程式配平",
          "f": "../../classroom.html#balance",
          "src": "本站原创",
          "fq": 20,
          "sc": 8,
          "tag": "key",
          "d": "配平的本质是原子守恒：左边几种原子、各几个，右边必须一模一样。先配复杂物质，最后配单质。"
        }
      ]
    }
  ]
};
