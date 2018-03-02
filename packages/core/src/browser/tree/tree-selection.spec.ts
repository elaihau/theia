/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { expect } from 'chai';
import { ISelectableTreeNode } from './tree-selection';
import { MockTreeSelectionService } from './test/mock-tree-selection';

describe('tree-selection', () => {

    describe('select-node', () => {

        interface Input {
            readonly initialState: string[];
            readonly selection: string;
            readonly multi: boolean;
            readonly expectation: string[];
        }
        ([
            {
                initialState: ['A'],
                selection: 'A',
                multi: false,
                expectation: ['A']
            },
            {
                initialState: ['A'],
                selection: 'A',
                multi: true,
                expectation: ['A']
            },
            {
                initialState: ['A'],
                selection: 'X',
                multi: false,
                expectation: ['X']
            },
            {
                initialState: ['A'],
                selection: 'X',
                multi: true,
                expectation: ['X', 'A']
            },
            // --------------------------------
            {
                initialState: ['B', 'A'],
                selection: 'A',
                multi: false,
                expectation: ['A']
            },
            {
                initialState: ['B', 'A'],
                selection: 'A',
                multi: true,
                expectation: ['A', 'B']
            },
            {
                initialState: ['B', 'A'],
                selection: 'X',
                multi: false,
                expectation: ['X']
            },
            {
                initialState: ['B', 'A'],
                selection: 'X',
                multi: true,
                expectation: ['X', 'B', 'A']
            },
            // --------------------------------
            {
                initialState: [],
                selection: 'A',
                multi: false,
                expectation: ['A']
            },
            {
                initialState: [],
                selection: 'A',
                multi: true,
                expectation: ['A']
            }
        ] as Input[]).forEach(test => {
            // tslint:disable-next-line:max-line-length
            it(`Selected nodes: ${JSON.stringify(test.initialState)} => Select: [${test.selection}, multi: ${test.multi ? `yes` : `no`}] => Expected: ${JSON.stringify(test.expectation)}`, () => {
                const nodes = test.initialState.map(id => createTreeNode(id, true));
                const selection = nodes.find(n => n.id === test.selection) || createTreeNode(test.selection, false);
                const service = new MockTreeSelectionService(nodes);
                service.selectNode(selection!, { multi: test.multi });
                const actual = service.selectedNodes;
                const expected = test.expectation.map(id => nodes.find(n => n.id === id) || createTreeNode(id, true));
                expect(actual).to.be.deep.equal(expected, `Expected: ${JSON.stringify(expected)}, actual: ${JSON.stringify(actual)}`);
            });
        });

    });

});

function createTreeNode(id: string, selected: boolean): ISelectableTreeNode {
    return {
        id,
        name: id,
        selected,
        parent: undefined
    };
}
