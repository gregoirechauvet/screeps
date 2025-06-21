module.exports = {
  /**
   * @param {Creep} creep
   * @param {RoomObject} target
   * @param {(creep: Creep) => CreepActionReturnCode} action
   **/
  doOrMove(creep, target, action) {
    const workAction = action(creep);
    if (workAction === ERR_NOT_IN_RANGE) {
      creep.moveTo(target);
    } else if (workAction !== OK) {
      console.log(`Unexpected work action ${workAction} for creep ${creep.name}`);
    }
  },
  /**
   * @param {BodyPartConstant[]} bodyParts
   * @return {number}
   **/
  computePartCost(bodyParts) {
    return bodyParts.reduce((cost, part) => cost + BODYPART_COST[part], 0);
  },
};
