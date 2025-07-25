// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStructureInterface {
    function getValue(uint256 _id) external view returns (uint256);
}

/**
 * @title StructuredLinkedList
 * @author Vittorio Minacori (https://github.com/vittominacori)
 * @dev An utility library for working with sorted linked list data structures in your Solidity project.
 */
library StructuredLinkedList {
    struct List {
        uint256 size;
        mapping(uint256 => mapping(bool => uint256)) list;
    }

    uint256 private constant _NULL = 0;
    uint256 private constant _HEAD = 0;
    uint256 private constant _anchorSize = 10;

    bool private constant _PREV = false;
    bool private constant _NEXT = true;

    /**
     * @dev Insert node `_new` beside existing node `_node` in direction `_NEXT`.
     * @param self Stored linked list from contract.
     * @param _node Existing node.
     * @param _new New node to insert.
     * @return bool True if success, false otherwise.
     */
    function insertAfter(List storage self, uint256 _node, uint256 _new) internal returns (bool) {
        return _insert(self, _node, _new, _NEXT);
    }

    /**
     * @dev Insert node `_new` beside existing node `_node` in direction `_PREV`.
     * @param self Stored linked list from contract.
     * @param _node Existing node.
     * @param _new New node to insert.
     * @return bool True if success, false otherwise.
     */
    function insertBefore(List storage self, uint256 _node, uint256 _new) internal returns (bool) {
        return _insert(self, _node, _new, _PREV);
    }

    /**
     * @dev Removes an entry from the linked list.
     * @param self Stored linked list from contract.
     * @param _node Node to remove from the list.
     * @return uint256 The removed node.
     */
    function remove(List storage self, uint256 _node) internal returns (uint256) {
        if ((_node == _NULL) || (!nodeExists(self, _node))) {
            return 0;
        }
        _createLink(self, self.list[_node][_PREV], self.list[_node][_NEXT], _NEXT);
        delete self.list[_node][_PREV];
        delete self.list[_node][_NEXT];

        self.size -= 1;

        return _node;
    }

    /**
     * @dev Pushes an entry to the head of the linked list.
     * @param self Stored linked list from contract.
     * @param _node New entry to push to the head.
     * @return bool True if success, false otherwise.
     */
    function pushFront(List storage self, uint256 _node) internal returns (bool) {
        return _push(self, _node, _NEXT);
    }

    /**
     * @dev Pushes an entry to the tail of the linked list.
     * @param self Stored linked list from contract.
     * @param _node New entry to push to the tail.
     * @return bool True if success, false otherwise.
     */
    function pushBack(List storage self, uint256 _node) internal returns (bool) {
        return _push(self, _node, _PREV);
    }

    /**
     * @dev Pops the first entry from the head of the linked list.
     * @param self Stored linked list from contract.
     * @return uint256 The removed node.
     */
    function popFront(List storage self) internal returns (uint256) {
        return _pop(self, _NEXT);
    }

    /**
     * @dev Pops the first entry from the tail of the linked list.
     * @param self Stored linked list from contract.
     * @return uint256 The removed node.
     */
    function popBack(List storage self) internal returns (uint256) {
        return _pop(self, _PREV);
    }

    /**
     * @dev Checks if the list exists.
     * @param self Stored linked list from contract.
     * @return bool True if list exists, false otherwise.
     */
    function listExists(List storage self) internal view returns (bool) {
        // if the head node previous or next pointers both point to itself, then there are no items in the list
        return (self.list[_HEAD][_PREV] != _HEAD || self.list[_HEAD][_NEXT] != _HEAD);
    }

    /**
     * @dev Checks if the node exists.
     * @param self Stored linked list from contract.
     * @param _node A node to search for.
     * @return bool True if node exists, false otherwise.
     */
    function nodeExists(List storage self, uint256 _node) internal view returns (bool) {
        if (self.list[_node][_PREV] == _HEAD && self.list[_node][_NEXT] == _HEAD) {
            return (self.list[_HEAD][_NEXT] == _node);
        } else {
            return true;
        }
    }

    /**
     * @dev Returns the number of elements in the list.
     * @param self Stored linked list from contract.
     * @return uint256 The size of the list.
     */
    function sizeOf(List storage self) internal view returns (uint256) {
        return self.size;
    }

    /**
     * @dev Returns the links of a node as a tuple.
     * @param self Stored linked list from contract.
     * @param _node Id of the node to get.
     * @return bool, uint256, uint256 True if node exists or false otherwise, previous node, next node.
     */
    function getNode(List storage self, uint256 _node) internal view returns (bool, uint256, uint256) {
        if (!nodeExists(self, _node)) {
            return (false, 0, 0);
        } else {
            return (true, self.list[_node][_PREV], self.list[_node][_NEXT]);
        }
    }

    function getNodesInNthAnchor(List storage self, uint256 _node, uint256 anchorIndex) internal view returns (uint256[] memory) {
        (bool exists, uint256 prev, uint256 next) = getNode(self, _HEAD);
        uint256[] memory returnVals = new uint256[](_anchorSize);
        uint256 activeNode = next;
        // Get to the correct starting position
        for(uint i = 0; i < _anchorSize * anchorIndex; i++){
            (bool success, uint256 prev, uint256 nextNode) = getNode(self, activeNode);
            if(!success) break;
            activeNode = nextNode;
        }
        uint256 foundItemsCount = 0;
        // Get the right number of values
        for(uint i = 0; i < _anchorSize; i++){
            (bool success, uint256 prev, uint256 nextNode) = getNode(self, activeNode);
            foundItemsCount++;
            returnVals[i] = activeNode;
            if(nextNode == _HEAD || !success) break;
            activeNode = nextNode;
        }
        if(foundItemsCount < _anchorSize) {
            uint256[] memory tempReturnVals = new uint256[](foundItemsCount);
            for(uint i = 0; i < foundItemsCount; i++) {
                tempReturnVals[i] = returnVals[i];
            }
            returnVals = tempReturnVals;
        }
        return returnVals;
    }

    /**
     * @dev Returns the link of a node `_node` in direction `_direction`.
     * @param self Stored linked list from contract.
     * @param _node Id of the node to step from.
     * @param _direction Direction to step in.
     * @return bool, uint256 True if node exists or false otherwise, node in _direction.
     */
    function getAdjacent(List storage self, uint256 _node, bool _direction) internal view returns (bool, uint256) {
        if (!nodeExists(self, _node)) {
            return (false, 0);
        } else {
            return (true, self.list[_node][_direction]);
        }
    }

    /**
     * @dev Returns the link of a node `_node` in direction `_NEXT`.
     * @param self Stored linked list from contract.
     * @param _node Id of the node to step from.
     * @return bool, uint256 True if node exists or false otherwise, next node.
     */
    function getNextNode(List storage self, uint256 _node) internal view returns (bool, uint256) {
        return getAdjacent(self, _node, _NEXT);
    }

    /**
     * @dev Returns the link of a node `_node` in direction `_PREV`.
     * @param self Stored linked list from contract.
     * @param _node Id of the node to step from.
     * @return bool, uint256 True if node exists or false otherwise, previous node.
     */
    function getPreviousNode(List storage self, uint256 _node) internal view returns (bool, uint256) {
        return getAdjacent(self, _node, _PREV);
    }

    /**
     * @dev Can be used before `insert` to build an ordered list.
     * Get the node and then `insertBefore` or `insertAfter` basing on your list order.
     * If you want to order basing on other than `structure.getValue()` override this function.
     * @param self Stored linked list from contract.
     * @param _structure The structure instance.
     * @param _value Value to seek.
     * @return uint256 Next node with a value less than _value.
     */
    function getSortedSpot(List storage self, address _structure, uint256 _value) internal view returns (uint256) {
        if (sizeOf(self) == 0) {
            return 0;
        }

        uint256 next;
        (, next) = getAdjacent(self, _HEAD, _NEXT);
        while ((next != 0) && ((_value < IStructureInterface(_structure).getValue(next)) != _NEXT)) {
            next = self.list[next][_NEXT];
        }
        return next;
    }

    /**
     * @dev Pushes an entry to the head of the linked list.
     * @param self Stored linked list from contract.
     * @param _node New entry to push to the head.
     * @param _direction Push to the head (_NEXT) or tail (_PREV).
     * @return bool True if success, false otherwise.
     */
    function _push(List storage self, uint256 _node, bool _direction) private returns (bool) {
        return _insert(self, _HEAD, _node, _direction);
    }

    /**
     * @dev Pops the first entry from the linked list.
     * @param self Stored linked list from contract.
     * @param _direction Pop from the head (_NEXT) or the tail (_PREV).
     * @return uint256 The removed node.
     */
    function _pop(List storage self, bool _direction) private returns (uint256) {
        uint256 adj;
        (, adj) = getAdjacent(self, _HEAD, _direction);
        return remove(self, adj);
    }

    /**
     * @dev Insert node `_new` beside existing node `_node` in direction `_direction`.
     * @param self Stored linked list from contract.
     * @param _node Existing node.
     * @param _new New node to insert.
     * @param _direction Direction to insert node in.
     * @return bool True if success, false otherwise.
     */
    function _insert(List storage self, uint256 _node, uint256 _new, bool _direction) private returns (bool) {
        if (!nodeExists(self, _new) && nodeExists(self, _node)) {
            uint256 c = self.list[_node][_direction];
            _createLink(self, _node, _new, _direction);
            _createLink(self, _new, c, _direction);

            self.size += 1;

            return true;
        }

        return false;
    }

    /**
     * @dev Creates a bidirectional link between two nodes on direction `_direction`.
     * @param self Stored linked list from contract.
     * @param _node Existing node.
     * @param _link Node to link to in the _direction.
     * @param _direction Direction to insert node in.
     */
    function _createLink(List storage self, uint256 _node, uint256 _link, bool _direction) private {
        self.list[_link][!_direction] = _node;
        self.list[_node][_direction] = _link;
    }
}