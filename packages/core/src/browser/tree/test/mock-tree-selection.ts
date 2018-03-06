/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { TreeNode } from '../tree';
import { SelectableTreeNode, TreeSelectionServiceImpl } from '../tree-selection';

export class MockTreeSelectionService extends TreeSelectionServiceImpl {

    constructor(initialSelection?: SelectableTreeNode[]) {
        super();
        if (initialSelection) {
            this._selectedNodes.push(...initialSelection);
            initialSelection.forEach(node => node.selected = true);
        }
    }

    validateNode(node: TreeNode | undefined): TreeNode | undefined {
        return node;
    }

}
