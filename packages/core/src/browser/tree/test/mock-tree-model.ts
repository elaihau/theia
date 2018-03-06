/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ITreeNode, ICompositeTreeNode } from '../tree';
import { ISelectableTreeNode, IExpandableTreeNode } from '@theia/core/lib/browser';

export interface Node {
    readonly id: string;
    readonly children?: Node[];
}

export namespace Node {
    export function toTreeNode(root: Node, parent?: ICompositeTreeNode): ITreeNode {
        const { id } = root;
        const name = id;
        const selected = false;
        const expanded = false;
        const node: ICompositeTreeNode & ISelectableTreeNode & IExpandableTreeNode = {
            id,
            name,
            selected,
            expanded,
            parent: parent,
            children: []
        };
        const children = (root.children || []).map(child => Node.toTreeNode(child, node));
        if (children.length === 0) {
            return node;
        } else {
            return {
                ...node,
                selected,
                expanded,
                children
            } as ICompositeTreeNode & ISelectableTreeNode & IExpandableTreeNode;
        }
    }
}

export const MOCK_ROOT = Node.toTreeNode({
    "id": "1",
    "children": [
        {
            "id": "1.1",
            "children": [
                {
                    "id": "1.1.1"
                },
                {
                    "id": "1.1.2"
                }
            ]
        },
        {
            "id": "1.2",
            "children": [
                {
                    "id": "1.2.1",
                    "children": [
                        {
                            "id": "1.2.1.1"
                        },
                        {
                            "id": "1.2.1.2"
                        }
                    ]
                },
                {
                    "id": "1.2.2"
                },
                {
                    "id": "1.2.3"
                }
            ]
        },
        {
            "id": "1.3"
        }
    ]
});
