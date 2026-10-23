import { HOLE_KING_PHASES } from "../holeMechanics.js";
const tilemap = new URL("../../../assets/levels/level-10/tilemap.json", import.meta.url).href;
const bridge = (id,x,width=128,controller) => ({id,x,y:576,width,height:24,triggerDistance:400,warningMs:1500,openMs:2000,closedMs:3000,...(controller?{controller}: {})});
export default {
  schemaVersion:2,id:"level-10",name:"구멍 코스",order:9,description:"표시된 구멍을 뛰어넘고 움직이는 구멍 대왕을 멈춰요",visualTheme:"hole-canyon",
  assets:{tilemap,tilemapKey:"level-10-map",tileset:"starlight_tileset",preview:"stage_preview_hole",
    backgrounds:{normal:{far:"bg_hole_far",mid:"bg_normal_mid",near:"bg_normal_near"},boss:{far:"bg_hole_far",mid:"bg_normal_mid",near:"bg_normal_near"}},
    objects:{items:{star:"item_star",percent_small:"item_percent_small",percent_large:"item_percent_large",horn:"item_horn",wings:"item_wings",alicorn:"item_alicorn"},checkpoint:"checkpoint_flag",gate:"rainbow_gate"},
    bgm:{field:"bgm_field",boss:"bgm_boss",clear:"bgm_clear"}},
  world:{width:16384,height:768,tileSize:64},parallax:{sky:0.02,far:0.08,mid:0.2,near:0.45,layerAlpha:{mid:0,near:0}},
  progression:{direction:"right",retainAbilities:true},player:{spawn:{x:128,y:576}},
  exit:{x:16192,y:576,enterFrom:"right",presentation:{kind:"real",placement:"ground",effects:"normal",graybox:false}},
  sections:[
    {id:"hole_gate",type:"normal",xStart:0,xEnd:2048,mood:"normal"},
    {id:"bridge_practice",type:"normal",xStart:2048,xEnd:4608,mood:"normal"},
    {id:"broken_road",type:"normal",xStart:4608,xEnd:7168,mood:"normal"},
    {id:"floating_stones",type:"normal",xStart:7168,xEnd:10624,mood:"normal"},
    {id:"porous_palace",type:"normal",xStart:10624,xEnd:14592,mood:"normal"},
    {id:"boss_hole",type:"boss",xStart:14592,xEnd:16384,mood:"boss",lockCamera:true,
      boss:{key:"hole_king",hp:3,phases:Object.values(HOLE_KING_PHASES).map(({id})=>id),spawn:{x:15680,y:576},environment:{suspend:[]}}}
  ],
  cameraCues:[{id:"cue_hole_first",xStart:2112,xEnd:2688,lookAhead:240,targetX:2752},
    {id:"cue_hole_flight",xStart:7680,xEnd:8192,lookAhead:240,targetX:8352},
    {id:"cue_hole_boss",xStart:13824,xEnd:14592,lookAhead:240,targetX:15072}],
  checkpoints:[{id:"cp_hole_practice",x:2176,y:576,activationTop:0,restoresHealth:true},
    {id:"cp_hole_road",x:4864,y:576,activationTop:0}, {id:"cp_hole_flight",x:7040,y:576,activationTop:0,restoresHealth:true},
    {id:"cp_hole_sky",x:7936,y:576,activationTop:0,restoresHealth:true},
    {id:"cp_hole_palace",x:10688,y:576,activationTop:0,restoresHealth:true},
    {id:"cp_hole_last_gap",x:12480,y:576,activationTop:0,restoresHealth:true},
    {id:"cp_hole_boss",x:14336,y:576,activationTop:0,restoresHealth:true}],
  enemies:[{id:"hole_potato_a",type:"raw_potato",x:4480,y:576,patrol:64},{id:"hole_potato_b",type:"raw_potato",x:13632,y:576,patrol:80}],
  items:[{id:"hole_horn",type:"horn",x:768,y:576,activationTop:0},{id:"hole_wings",type:"wings",x:7424,y:576,activationTop:0},
    {id:"hole_fever",type:"alicorn",x:11904,y:576,activationTop:0},
    ...[448,1280,1920,2752,3392,3904,4672,5216,5792,6368,6912,7680,8352,9088,9792,10432,11360,12096,12832,13760,14208]
      .map((x,index)=>({id:`hole_arc_${index}`,type:"star_arc",x,y:[9792,13760].includes(x)?280:420,count:6,radius:100})),
    {id:"hole_secret_guide",type:"star_arc",x:9776,y:270,count:5,radius:72},{id:"hole_secret_reward",type:"percent_large",x:9856,y:352},
    {id:"hole_stage_reward",type:"percent_small",x:14144,y:576}],
  secrets:[{id:"hole_window",name:"별빛 구멍 전망대",xStart:9600,xEnd:10048,yTop:150,yBottom:440,reward:200,guideItemIds:["hole_secret_guide"],rewardItemId:"hole_secret_reward"}],
  terrainMechanics:{timedHoles:[bridge("hole_bridge_a",2688),bridge("hole_bridge_b",3840),bridge("hole_bridge_c",6272,192),bridge("hole_bridge_d",11264,192),
      bridge("hole_boss_left",14784,128,"hole_king"),bridge("hole_boss_near",15360,128,"hole_king")],
    movingPlatforms:[{id:"hole_flight_bridge",x:8224,y:480,width:160,height:32,axis:"x",distance:160,speed:72}],updrafts:[],crumblePlatforms:[]},
  hazards:[...[[2688,2816,2176],[3840,3968,2176],[5120,5312,4864],[6272,6464,4864],[8192,8512,7936],[11264,11456,10688],[12736,12928,12480],[14784,14912,14336],[15360,15488,14336]]
    .map(([xStart,xEnd,respawnX],index)=>({id:`hole_pit_${index}`,type:"pit",xStart,xEnd,respawnX}))],
  environment:{},objectives:{required:[{type:"defeat_boss",target:"hole_king"},{type:"reach_gate"}],
    optional:[{type:"collect_stars",count:70,reward:500},{type:"find_secrets",count:1,reward:300},{type:"clear_time",seconds:480,reward:400},{type:"no_damage",reward:800}]},
  difficulty:{easyMode:{extraCheckpoints:[{id:"cp_hole_easy",x:5888,y:576,activationTop:0,restoresHealth:true}],removeEnemies:["hole_potato_b"],
    player:{extraHp:2,flightDrainMultiplier:0.65},boss:{telegraphMultiplier:1.35,vulnerabilityMultiplier:1.3},
    terrainMechanics:{movingSpeedMultiplier:0.8,crumbleDelayMultiplier:1.3,holeWarningMultiplier:1.5},pitScoreLoss:0}}
};
