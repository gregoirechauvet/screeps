const utils = require("utils");

/** @param {Creep} creep **/
const newHarvestState = (creep) => {
  const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (structure) =>
      structure.structureType === STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
  });
  if (container != null) {
    return { action: "withdraw", containerId: container.id };
  }

  const source = creep.pos.findClosestByPath(FIND_SOURCES);
  return { action: "harvest", sourceId: source.id };
};

const actions = {
  default(creep, state) {
    return newHarvestState(creep);
  },
  harvest(creep, state) {
    const source = Game.getObjectById(state.sourceId);
    utils.doOrMove(creep, source, (creep) => creep.harvest(source));

    if (creep.store.getFreeCapacity() === 0) {
      return { action: "upgrade" };
    }
  },
  withdraw(creep, state) {
    const container = Game.getObjectById(state.containerId);
    utils.doOrMove(creep, container, (creep) => creep.withdraw(container, RESOURCE_ENERGY));

    if (creep.store.getFreeCapacity() === 0) {
      return { action: "upgrade" };
    }
  },
  upgrade(creep, state) {
    const controller = creep.room.controller;
    utils.doOrMove(creep, controller, (creep) => creep.upgradeController(controller));

    if (creep.store.getUsedCapacity() === 0) {
      return newHarvestState(creep);
    }
  },
};

module.exports = {
  spawn(spawnStructure, initialState) {
    const count = Memory.upgraderCount != null ? Memory.upgraderCount : 0;

    const energyCapacity = spawnStructure.room.energyCapacityAvailable;
    const [bodyParts, mark] =
      energyCapacity >= 500 ? [[CARRY, CARRY, MOVE, MOVE, MOVE, WORK, WORK], 2] : [[CARRY, WORK, MOVE], 1];

    const resp = spawnStructure.spawnCreep(bodyParts, `Upgrader ${count} - MK${mark}`, {
      memory: { role: "upgrader", mark, state: initialState },
    });
    const ok = resp === OK;
    if (ok) {
      Memory.upgraderCount = count + 1;
    }
    return ok;
  },

  /** @param {Creep} creep **/
  run(creep) {
    const { state } = creep.memory;

    const actionFn = state != null ? actions[state.action] : actions.default;
    if (actionFn === undefined) {
      throw Error(`Unknown action ${state.action}`);
    }

    const updatedState = actionFn(creep, state);

    if (updatedState != null) {
      creep.memory.state = updatedState;
    }
  },
};
