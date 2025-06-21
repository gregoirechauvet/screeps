const partCost = {
  move: 50,
  carry: 50,
  work: 20,
  heal: 200,
  tough: 20,
  attack: 80,
  ranged_attack: 150,
  claim: 600,
};

module.exports = {
  /**
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {() => number} action
   **/
  doOrMove(creep, target, action) {
    const workAction = action(creep);
    if (workAction === ERR_NOT_IN_RANGE) {
      creep.moveTo(target);
    } else if (workAction !== OK) {
      // throw Error(`Unexpected work action ${workAction} for creep ${creep.name}`);
      console.log(`Unexpected work action ${workAction} for creep ${creep.name}`);
    }
  },
  /**
   * @param {string[]} bodyParts
   * @return {number}
   **/
  computePartCost(bodyParts) {
    return bodyParts.reduce((cost, part) => {
      const singlePartCost = partCost[part];
      if (singlePartCost === undefined) {
        throw Error(`Unknown part cost: ${part}`);
      }

      return cost + partCost[part];
    }, 0);
  },
};
