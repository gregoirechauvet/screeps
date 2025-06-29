const utils = require("./utils");

/**
 * @typedef {{ action: "harvest", sourceId: Id<Source> }} HarvestState
 * @typedef {{ action: "withdraw", containerId: Id<StructureContainer> }} WithdrawState
 * @typedef {{ action: "build", constructionId: Id<ConstructionSite> }} BuildState
 * @typedef {{ action: "repair", structureId: Id<Structure> }} RepairState
 * @typedef {{ action: "standby" }} StandbyState
 * @typedef { HarvestState | WithdrawState | BuildState | RepairState | StandbyState } BuilderState
 */

/**
 * @param {Creep} creep
 * @returns {BuilderState}
 */
const newHarvestState = (creep) => {
  /** @type {StructureContainer | null} */
  const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (structure) =>
      structure.structureType === STRUCTURE_CONTAINER && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
  });
  if (container != null) {
    return { action: "withdraw", containerId: container.id };
  }

  const source = creep.pos.findClosestByPath(FIND_SOURCES);
  if (source != null) {
    return { action: "harvest", sourceId: source.id };
  }

  return { action: "standby" };
};

/**
 * @param {Creep} creep
 * @returns {BuilderState | undefined}
 */
const newBuildState = (creep) => {
  const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
  constructionSites.sort((a, b) => b.progress - a.progress);
  if (constructionSites.length > 0) {
    const constructionTarget = constructionSites[0];
    return { action: "build", constructionId: constructionTarget.id };
  }

  const structuresForRepair = creep.room.find(FIND_STRUCTURES).filter((a) => a.hits / a.hitsMax <= 0.8);
  if (structuresForRepair.length === 0) {
    return { action: "standby" };
  }

  structuresForRepair.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
  return { action: "repair", structureId: structuresForRepair[0].id };
};

/**
 * @param {Creep} creep
 * @param {Id<ConstructionSite>} constructionId
 */
function build(creep, constructionId) {
  const constructionSite = Game.getObjectById(constructionId);
  if (constructionSite == null) {
    creep.memory.state = newHarvestState(creep);
    return;
  }

  utils.doOrMove(creep, constructionSite, (creep) => creep.build(constructionSite));
}

const actions = {
  /**
   * @param {Creep} creep
   * @return {BuilderState}
   */
  default(creep) {
    return newHarvestState(creep);
  },
  /**
   * @param {Creep} creep
   * @param {HarvestState} state
   * @return {BuilderState | undefined}
   */
  harvest(creep, state) {
    const source = Game.getObjectById(state.sourceId);
    utils.doOrMove(creep, source, (creep) => creep.harvest(source));

    if (creep.store.getFreeCapacity() === 0) {
      return newBuildState(creep);
    }
  },
  /**
   * @param {Creep} creep
   * @param {WithdrawState} state
   * @return {BuilderState | undefined}
   */
  withdraw(creep, state) {
    const container = Game.getObjectById(state.containerId);
    utils.doOrMove(creep, container, (creep) => creep.withdraw(container, RESOURCE_ENERGY));

    if (creep.store.getFreeCapacity() === 0) {
      return newBuildState(creep);
    }
  },
  /**
   * @param {Creep} creep
   * @param {RepairState} state
   * @return {BuilderState | undefined}
   */
  repair(creep, state) {
    const structure = Game.getObjectById(state.structureId);
    utils.doOrMove(creep, structure, (creep) => creep.repair(structure));

    if (creep.store.getUsedCapacity() === 0 || structure.hits === structure.hitsMax) {
      return (creep.memory.state = newHarvestState(creep));
    }
  },
  /**
   * @param {Creep} creep
   * @param {BuildState} state
   * @return {BuilderState | undefined}
   */
  build(creep, state) {
    build(creep, state.constructionId);

    if (creep.store.getUsedCapacity() === 0) {
      return newHarvestState(creep);
    }
  },
  changeRoom(creep, state) {
    creep.moveTo(new RoomPosition(25, 25, state.roomName));

    if (creep.room.name === state.roomName) {
      return newHarvestState(creep);
    }
  },
  /**
   * @param {Creep} creep
   * @param {StandbyState} state
   * @return {BuilderState?}
   */
  standby(creep, state) {
    const roadStructuresBelow = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) =>
        structure.structureType === STRUCTURE_ROAD &&
        structure.pos.x === creep.pos.x &&
        structure.pos.y === creep.pos.y,
    });

    const isSteppingOnRoad = roadStructuresBelow.length > 0;
    if (isSteppingOnRoad) {
      /** @type {DirectionConstant[]} */
      const allDirections = [TOP_LEFT, TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT];
      const randomDirection = allDirections[Math.floor(Math.random() * allDirections.length)];
      creep.move(randomDirection);
    }

    return newBuildState(creep);
  },
};

module.exports = {
  /**
   * @param {StructureSpawn} spawnStructure
   * @returns {bool}
   */
  spawn(spawnStructure, initialState) {
    // Idea: auto-scale builders based on amount of work and repairs to do.

    const count = Memory.builderCount != null ? Memory.builderCount : 0;

    const bodyOptions = [
      [CARRY, CARRY, MOVE, MOVE, MOVE, WORK, WORK],
      [CARRY, WORK, MOVE],
    ];

    const energyCapacity = spawnStructure.room.energyCapacityAvailable;
    const index = bodyOptions.findIndex((bodyParts) => {
      const cost = utils.computePartCost(bodyParts);
      return energyCapacity >= cost;
    });
    if (index === -1) {
      throw Error("No body option available");
    }

    const mark = bodyOptions.length - index;
    const bodyParts = bodyOptions[index];

    const resp = spawnStructure.spawnCreep(bodyParts, `Builder ${count} - MK${mark}`, {
      memory: { role: "builder", mark, state: initialState },
    });
    if (resp === OK) {
      Memory.builderCount = count + 1;
    }
    return resp;
  },

  /** @param {Creep} creep */
  run(creep) {
    /** @type {BuilderState} */
    const state = creep.memory.state || actions.default(creep);

    const actionFn = actions[state.action];
    if (actionFn === undefined) {
      throw Error(`Unknown action ${state.action}`);
    }

    const updatedState = actionFn(creep, state);

    if (updatedState != null) {
      creep.memory.state = updatedState;
    }
  },
};
