/* ============================================================
   物理学科目录数据
   ------------------------------------------------------------
   路径相对于 ai-cases/physicslearn/index.html
   f  : 演示页（内嵌到右侧 iframe）
   t  : 左侧条目名
   d  : 「想一想」——进去之前先猜一句，出来再对答案
   group : 同一 tab 内的分组小标题（可省略）
   fq : 考频（%），sc : 平均分值（分）——近五年考卷权重整理的近似参考值
   tag: key 重点学 / hot 高频 / gap 查漏补缺（工具类条目不标）
   ============================================================ */

window.SUBJECT = {
  "key": "physics",
  "name": "物理",
  "title": "中学物理可视化互动学习",
  "subtitle": "先看模型怎么动，再做对应的题——初二到高三按年级挑演示，高一以上还有铜匠实验室的 3D 实验课：光电效应、电容器充放电、自感涡流，每门课带中控台和分步教学。",
  "grades": [
    {
      "id": "g8",
      "label": "初二",
      "hint": "打好基础",
      "items": [
        {
          "k": "lens",
          "group": "光现象",
          "t": "凸透镜成像规律",
          "f": "../探究凸透镜成像.html",
          "src": "AIEdTools",
          "fq": 12,
          "sc": 6,
          "tag": "hot",
          "d": "蜡烛从 2 倍焦距外往焦点移，像会越来越大、越来越远。移到焦点以内，为什么像突然跑到蜡烛同侧去了？"
        },
        {
          "k": "opticlab",
          "t": "薄透镜成像实验室",
          "f": "../../optics.html",
          "src": "本站原创",
          "fq": 12,
          "sc": 6,
          "tag": "hot",
          "d": "拖动蜡烛改物距，两条特殊光线交出像点。u > 2f、f < u < 2f、u < f 三种情况，像的正倒、大小、虚实各是什么？"
        },
        {
          "k": "mechlab",
          "group": "力与运动",
          "t": "斜面与摩擦力",
          "f": "../../mechanics.html",
          "src": "本站原创",
          "fq": 15,
          "sc": 8,
          "tag": "hot",
          "d": "倾角一点点加大，木块什么时候开始下滑？静摩擦系数 μs 和滑动摩擦系数 μk 到底哪个大、大在哪一步？"
        },
        {
          "k": "balance",
          "t": "平衡木与压敏电阻",
          "f": "../物理互动课堂-平衡木与压敏电阻动态分析.html",
          "src": "AIEdTools",
          "fq": 6,
          "sc": 4,
          "tag": "gap",
          "d": "人往平衡木一端走，两端支持力怎么变？压敏电阻的阻值随压力变化，又怎么把「力的变化」变成「电表的读数」？"
        }
      ]
    },
    {
      "id": "g9",
      "label": "初三",
      "hint": "中考攻坚",
      "items": [
        {
          "k": "circuit",
          "group": "电学",
          "t": "电路实验室（节点法求解）",
          "f": "../../circuit.html",
          "src": "本站原创",
          "fq": 20,
          "sc": 9,
          "tag": "key",
          "d": "串并联混在一起的电路，工程师怎么算电流？改一个电阻，为什么另一条支路的电流也跟着变？"
        },
        {
          "k": "electrolab",
          "t": "电学实验室 ElectroLab",
          "f": "../electro-lab/ElectroLab-open.html",
          "src": "electro-lab",
          "fq": 18,
          "sc": 8,
          "tag": "key",
          "d": "自己搭一条回路：电源、开关、灯泡、电阻随便接。短路和断路在电路图上差在哪一根线？"
        },
        {
          "k": "oled",
          "t": "OLED 屏幕工作室",
          "f": "../electro-lab/OLED_Studio.html",
          "src": "electro-lab",
          "fq": 4,
          "sc": 3,
          "tag": "gap",
          "d": "屏幕上一个像素点，本质是一个会发光的二极管。给它多大电流，它才亮得刚好？"
        }
      ]
    },
    {
      "id": "g10",
      "label": "高一",
      "hint": "高考起步",
      "items": [
        {
          "k": "galileo",
          "group": "运动与力",
          "t": "伽利略的理想实验",
          "f": "../伽利略的理想实验.html",
          "src": "AIEdTools",
          "fq": 5,
          "sc": 4,
          "tag": "gap",
          "d": "把斜面一点点放平，小球就滚得越来越远。如果摩擦力真的为零，它会停在哪里？牛顿第一定律是怎么被「想」出来的？"
        },
        {
          "k": "forcesum",
          "t": "力的合成与分解",
          "f": "../physics-sim/simulations/mechanics/force-composition.html",
          "src": "physics-sim",
          "fq": 15,
          "sc": 8,
          "tag": "hot",
          "d": "两个力夹角从 0° 拉到 180°，合力从「和」掉到「差」。合力一定比每个分力都大吗？"
        },
        {
          "k": "projectile",
          "t": "抛体运动",
          "f": "../physixlab/ProjectileMotion/index.html",
          "src": "PhysiXLab",
          "fq": 18,
          "sc": 10,
          "tag": "key",
          "d": "平抛和斜抛，为什么水平方向永远匀速、竖直方向永远匀变速？把初速度调大，射程什么时候最大？"
        },
        {
          "k": "tj-accel-force-step",
          "kind": "lab",
          "group": "必修第一册",
          "t": "实验：探究加速度与力、质量的关系",
          "f": "../tongjiang/courses/accel-force-step.html",
          "src": "铜匠实验室",
          "d": "不直接测力、也不直接测加速度——一张纸带加几个槽码，能不能把 a 与 F、m 的关系量出来？（8 步：认识器材→平衡阻力→打纸带→…）"
        },
        {
          "k": "tj-energy-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "实验：验证机械能守恒定律",
          "f": "../tongjiang/courses/energy-step.html",
          "src": "铜匠实验室",
          "d": "重物下落时，减少的重力势能是不是正好变成了增加的动能？一条纸带能不能把这件事量出来？（8 步：认识器材→先通电后释放→选点→…）"
        },
        {
          "k": "tj-projectile-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "实验：探究平抛运动的特点",
          "f": "../tongjiang/courses/projectile-step.html",
          "src": "铜匠实验室",
          "d": "只靠一只斜槽和一块挡板，能不能把平抛拆成两个分运动、量出初速度？（9 步：认识器材→先做竖直→末端要水平→…）"
        },
        {
          "k": "tj-centripetal-step",
          "kind": "lab",
          "group": "必修第二册",
          "t": "探究向心力大小与半径、角速度、质量的关系",
          "f": "../tongjiang/courses/centripetal-step.html",
          "src": "铜匠实验室",
          "d": "这台手摇的演示器只给你两个标尺上的格数——能不能用它把 F 与 m、r、ω 的定量关系量出来？（8 步：认识演示器→仪器自检→质量关系→…）"
        }
      ]
    },
    {
      "id": "g11",
      "label": "高二",
      "hint": "电磁核心",
      "items": [
        {
          "k": "collide1d",
          "group": "动量（选择性必修一）",
          "t": "一维碰撞",
          "f": "../physics-sim/simulations/mechanics/momentum-conservation/1d-collision.html",
          "src": "physics-sim",
          "fq": 16,
          "sc": 10,
          "tag": "key",
          "d": "弹性碰撞和完全非弹性碰撞，动量都守恒，动能呢？质量相等时「交换速度」是怎么来的？"
        },
        {
          "k": "collide2d",
          "t": "二维碰撞",
          "f": "../physics-sim/simulations/mechanics/momentum-conservation/2d-collision.html",
          "src": "physics-sim",
          "fq": 8,
          "sc": 6,
          "tag": "hot",
          "d": "斜着撞一下，两个球分开的角度为什么总是 90°（等质量弹性碰撞时）？动量是矢量，得分方向算。"
        },
        {
          "k": "explosion",
          "t": "爆炸与反冲",
          "f": "../physics-sim/simulations/mechanics/momentum-conservation/explosion.html",
          "src": "physics-sim",
          "fq": 9,
          "sc": 6,
          "tag": "hot",
          "d": "炸开前总动量为零，炸开后两块为什么一定反向飞？火箭在真空里为什么也能加速？"
        },
        {
          "k": "humanboat",
          "t": "人船模型",
          "f": "../physics-sim/simulations/mechanics/momentum-conservation/human-boat.html",
          "src": "physics-sim",
          "fq": 7,
          "sc": 6,
          "tag": "hot",
          "d": "人在船上走，船为什么往反方向退？位移之比为什么正好等于质量的反比？"
        },
        {
          "k": "momentum",
          "t": "动量守恒总览",
          "f": "../physics-sim/simulations/mechanics/momentum-conservation.html",
          "src": "physics-sim",
          "fq": 16,
          "sc": 10,
          "tag": "key",
          "d": "碰撞、爆炸、反冲看着是三件事，为什么能用同一个式子算？先想清楚「系统」和「外力」怎么划。"
        },
        {
          "k": "harmonic",
          "group": "机械振动与波",
          "t": "简谐振动与图像",
          "f": "../physics-sim/simulations/waves/harmonic.html",
          "src": "physics-sim",
          "fq": 10,
          "sc": 6,
          "tag": "hot",
          "d": "振子来回一次的时间由什么决定？为什么振幅变大、周期却不变？"
        },
        {
          "k": "spring",
          "t": "弹簧振子",
          "f": "../physics-sim/simulations/waves/spring.html",
          "src": "physics-sim",
          "fq": 8,
          "sc": 5,
          "tag": "hot",
          "d": "T = 2π√(m/k)：加质量周期变长，换硬一点的弹簧周期变短。这个式子为什么和质量是开方关系？"
        },
        {
          "k": "wave1d",
          "t": "横波传播",
          "f": "../physics-sim/simulations/waves/transverse/transverse_wave.html",
          "src": "physics-sim",
          "fq": 12,
          "sc": 7,
          "tag": "hot",
          "d": "波往前跑，质点却只上下晃。波速由介质决定，那「频率变了波速不变」是怎么回事？"
        },
        {
          "k": "wavesum",
          "t": "波的叠加",
          "f": "../physics-sim/simulations/waves/wave-sum.html",
          "src": "physics-sim",
          "fq": 8,
          "sc": 5,
          "tag": "gap",
          "d": "两列波相遇，为什么能互不影响地穿过去？加强点和减弱点的位置由什么决定？"
        },
        {
          "k": "wave2d",
          "t": "二维水波与衍射",
          "f": "../physics-sim/simulations/waves/wave2d.html",
          "src": "physics-sim",
          "fq": 6,
          "sc": 4,
          "tag": "gap",
          "d": "波遇到窄缝会「拐弯」散开。缝宽和波长的比值，怎么决定衍射明不明显？"
        },
        {
          "k": "doppler",
          "t": "多普勒效应",
          "f": "../physics-sim/simulations/waves/doppler.html",
          "src": "physics-sim",
          "fq": 6,
          "sc": 5,
          "tag": "gap",
          "d": "救护车过来时音调高、过去后变低——波源在动，波长被压缩和拉伸了。靠近和远离的频率差多少？"
        },
        {
          "k": "doubleslit",
          "group": "光与电磁",
          "t": "双缝干涉",
          "f": "../physics-sim/simulations/optics-modern/double-slit.html",
          "src": "physics-sim",
          "fq": 10,
          "sc": 5,
          "tag": "hot",
          "d": "两条缝的光为什么会在屏上排出一条条亮纹？把缝距调大，条纹为什么反而变密？"
        },
        {
          "k": "selector",
          "t": "速度选择器",
          "f": "../physics-sim/simulations/electromagnetism/velocity-selector.html",
          "src": "physics-sim",
          "fq": 9,
          "sc": 6,
          "tag": "hot",
          "d": "电场力和洛伦兹力方向相反，只有某个速度的粒子能直线通过。这个速度为什么只由 E/B 决定？"
        },
        {
          "k": "efield",
          "t": "电场 3D 可视化",
          "f": "../physics-sim/simulations/electromagnetism/electric-field-3d.html",
          "src": "physics-sim",
          "fq": 8,
          "sc": 5,
          "tag": "gap",
          "d": "点电荷周围的电场线为什么是「发散」的？两个同号电荷中间，为什么有一片没有电场线的区域？"
        },
        {
          "k": "chargelimit",
          "t": "磁场中的带电粒子临界",
          "f": "../磁场中的带电粒子临界问题 - 物理探究实验室.html",
          "src": "AIEdTools",
          "fq": 14,
          "sc": 10,
          "tag": "key",
          "d": "粒子进磁场做圆周运动，边界上「刚好不射出」的临界条件是什么？圆心位置该怎么找？"
        },
        {
          "k": "tj-capacitor-step",
          "kind": "lab",
          "group": "必修第三册",
          "t": "观察电容器的充放电",
          "f": "../tongjiang/courses/capacitor-step.html",
          "src": "铜匠实验室",
          "d": "电容器里到底存了什么？能不能只用一个数把它的「肚量」量出来？（9 步：认识器材→合向 1 充电→合向 2 放电→…）"
        },
        {
          "k": "tj-self-induction-step",
          "kind": "lab",
          "group": "选择性必修第二册",
          "t": "自感与涡流",
          "f": "../tongjiang/courses/self-induction-step.html",
          "src": "铜匠实验室",
          "d": "线圈里只是多绕了几圈铜线，为什么两只灯泡亮得不一样？开关已经断开了，灯泡凭什么还能再亮一下？（9 步：认识器材→通电自感→断电自感→…）"
        },
        {
          "k": "tj-emf-step",
          "kind": "lab",
          "group": "必修第三册",
          "t": "测电源电动势和内阻",
          "f": "../tongjiang/courses/emf-step.html",
          "src": "铜匠实验室",
          "d": "一节旧干电池的电动势和内阻，怎么用一只电压表、一只电流表和一个滑动变阻器「测」出来？换一种接法，测出来的还一样吗？（9 步：认识接法→先到最大→多测几组→…）"
        },
        {
          "k": "tj-current-field-step",
          "kind": "lab",
          "group": "必修第三册",
          "t": "电流的磁场",
          "f": "../tongjiang/courses/current-field-step.html",
          "src": "铜匠实验室",
          "d": "磁场看不见摸不着，怎么把它画出来、又怎么判断它的方向？（9 步：铁屑显形→一圈圈同心圆→握导线定方向→…）"
        }
      ]
    },
    {
      "id": "g12",
      "label": "高三",
      "hint": "冲刺高考",
      "items": [
        {
          "k": "relativity",
          "group": "近代物理",
          "t": "相对论可视化",
          "f": "../physics-sim/simulations/optics-modern/relativity/relativity.html",
          "src": "physics-sim",
          "fq": 5,
          "sc": 4,
          "tag": "gap",
          "d": "速度接近光速时，时间为什么变慢、长度为什么变短？把速度拉到 0.9c，尺缩和钟慢各是多少倍？"
        },
        {
          "k": "collisionlab",
          "group": "综合复习",
          "t": "碰撞实验（PHYSLab）",
          "f": "../physixlab/Collision/index.html",
          "src": "PhysiXLab",
          "fq": 12,
          "sc": 8,
          "tag": "hot",
          "d": "换不同的质量比和恢复系数再撞一次：动量永远守恒，动能到底损失去哪儿了？"
        },
        {
          "k": "shmlab",
          "t": "简谐振动（PHYSLab）",
          "f": "../physixlab/SHM/index.html",
          "src": "PhysiXLab",
          "fq": 10,
          "sc": 6,
          "tag": "hot",
          "d": "把位移、速度、加速度三条曲线叠在一起看：速度最大时加速度为什么恰好为零？"
        },
        {
          "k": "tj-photoelectric-step",
          "kind": "lab",
          "group": "选择性必修第三册",
          "t": "光电效应",
          "f": "../tongjiang/courses/photoelectric-step.html",
          "src": "铜匠实验室",
          "d": "同一束光，为什么换成另一种金属就一个电子都打不出来？光电子的能量到底由光的什么决定？（9 步：认识电路→加到饱和→反向扫描→…）"
        },
        {
          "k": "tj-brownian-step",
          "kind": "lab",
          "group": "选择性必修第三册",
          "t": "布朗运动与扩散",
          "f": "../tongjiang/courses/brownian-step.html",
          "src": "铜匠实验室",
          "d": "看不见的分子，凭什么说它在乱动？（9 步：看见它在动→30 秒一个点→越久越远→…）"
        }
      ]
    },
    {
      "id": "gtopic",
      "label": "专题",
      "hint": "高频模型",
      "items": [
        {
          "k": "physim",
          "group": "仿真与工具",
          "t": "物理仿真门户",
          "f": "../physics-sim/index.html",
          "src": "physics-sim",
          "d": "力学、电磁学、波、光学四条主线共 16 个仿真。想按知识块通览一遍，从这里进。"
        },
        {
          "k": "music",
          "t": "音乐中的物理",
          "f": "../physixlab/MusicalPhysics/index.html",
          "src": "PhysiXLab",
          "d": "音调由频率决定、响度由振幅决定、音色由泛音决定。拨一根弦，这三件事分别对应哪个物理量？"
        },
        {
          "k": "formulalab",
          "group": "公式与量纲",
          "t": "数理公式实验室",
          "f": "../../formula.html",
          "src": "本站原创",
          "d": "31 条物理关系式集中在一页，改一个量，公式、读数、示意图一起动。单位对不上，式子一定错。"
        }
      ]
    }
  ]
};
