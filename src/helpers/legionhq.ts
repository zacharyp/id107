import { allUnits } from "sw-legion-data/lib/units";
import { allUpgrades } from "sw-legion-data/lib/upgrades";
import { ArmyLDF, UnitLDF, UpgradesLDF } from "sw-legion-data/lib/types/ldf";
import { loadArmy, pointsForUnit } from "./unit";
import { Army, Upgrade, Unit, SlotKey } from "sw-legion-data/lib/types";
import { keyFromSlot } from "./convert";


/**
 * parses individual units from url like:
 *   https://legionhq.thefifthtrooper.com/list/rebels/1abcxnz0,2ahiu000,2ah0000,1ah0eu00,2ajeejbdfda0,2hedf0,cr,cv,cl,cp,ch,bj,Of,Od,Oa,Ob,Da,Db,Dc,Dm,Ca,Cc,Cf,Ce
 *   https://legionhq.thefifthtrooper.com/list/republic/1nadtdv0di,1nscw00,1kwnzli00,1jhdp,2gy0000,1gyhphm00,1gbipkrknhz,jm,nf,ng,mi,jz,mv,Oc,Og,Oa,Ob,Dm,Dk,Da,De,Ca,Cg,Cd,Ch
 *   https://legionhq.thefifthtrooper.com/list/republic/1olnddtpqik,1gwnddtnznc,1fzlgocjbdcdj,1fzlhocdgdcdj,1fzkd0jb00
 *   https://legionhq.thefifthtrooper.com/list/republic/2gb0krknhz,1nadtndnc0,1jh0+1jj,3gy0000
 *
 * example of one unit: "1abcxnz0"
 */
const stringToUnits = (s: string): UnitLDF[] => {
  let result: UnitLDF[] = []

  let num = parseInt(s.slice(0, 1))

  let unitString = s.slice(1,3)

  // For when the unit has a companion unit
  let upgradesSplit = s.slice(3, s.length).split("\+")

  // Remove empty upgrade slots, noted by '0'
  let upgradesString = upgradesSplit[0].replace(/0/g, "");

  // console.log("s: " + s + ` unitString: ${unitString} upgradesString: ${upgradesString}`);

  // split upgrades by 2 characters each
  let upgradeLDFs = upgradesString.match(/.{1,2}/g) || []

  if (upgradesSplit.length > 1) {
    // pushing counterpart unit as upgrade
    upgradeLDFs.push(upgradesSplit[1].slice(1, 3))
  }

  // let foo: Unit[] = allUnits;
  let unit: Unit | undefined = allUnits.find(u => u.ldf == unitString)
  if (unit) {
    let unitLdf = <UnitLDF>{
        ldf: unit.ldf,
        rank: unit.rank,
        points: unit.points
      }

    const parsedUpgrades: { [key in SlotKey]?: string[] } = {};

    upgradeLDFs.forEach(ldf => {
      let slotKey: SlotKey = 'armament' // default
      let foundUpgrade = allUpgrades.find(u => u.ldf === ldf);
      if (foundUpgrade) {
        slotKey = keyFromSlot(foundUpgrade.slot);
      }
      if (!parsedUpgrades[slotKey]) {
        parsedUpgrades[slotKey] = [];
      }

      // @ts-ignore
      parsedUpgrades[slotKey].push(ldf);
    });

    unitLdf.upgrades = parsedUpgrades;

    for (var i=0; i<num; i++) {
      result.push(unitLdf)
    }
  }
  return result;
}

export const legionhqToArmy = (faction: string, legionhq: string): Army | undefined => {
  const uS: UnitLDF[] = [];

  // console.log(`legionhq string: ${legionhq}`)

  let strings = legionhq.split(",");
  let unitStrings = strings.filter(s => s.length > 2)
  // let commandStrings = strings.filter(s => s.length == 2)
  if (unitStrings.length < 0) {
    return undefined;
  } else {
    unitStrings.forEach(u => {
      let ldfs = stringToUnits(u)
      if (ldfs) {
        ldfs.forEach(ldf => uS.push(ldf))
      }
    })
  }

  let armyPoints = uS.map(u => pointsForUnit(u)).reduce((s, p) => s + p, 0);

  let armyLDF = <ArmyLDF>{
    points: armyPoints,
    faction: faction,
    commander: uS.filter(u => u.rank == "Commander"),
    operative: uS.filter(u => u.rank == "Operative"),
    corps: uS.filter(u => u.rank == "Corps"),
    special: uS.filter(u => u.rank == "Special Forces"),
    support: uS.filter(u => u.rank == "Support"),
    heavy: uS.filter(u => u.rank == "Heavy"),
  };

  return loadArmy(armyLDF)
}
