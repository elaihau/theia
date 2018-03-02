/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ITreeNode } from '../tree';
import { ISelectableTreeNode, TreeSelectionService } from '../tree-selection';

export class MockTreeSelectionService extends TreeSelectionService {

    constructor(initialSelection?: ISelectableTreeNode[]) {
        super();
        if (initialSelection) {
            this._selectedNodes.push(...initialSelection);
            initialSelection.forEach(node => node.selected = true);
        }
    }

    validateNode(node: ITreeNode | undefined): ITreeNode | undefined {
        return node;
    }

}
