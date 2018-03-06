/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { enableJSDOM } from '../../browser/test/jsdom';

const disableJSDOM = enableJSDOM();

import { expect } from 'chai';
import { Container } from 'inversify';
import { TreeModelImpl } from './tree-model';
import { MOCK_ROOT } from './test/mock-tree-model';
import { createTreeContainer } from './tree-container';
import { ExpandableTreeNode } from './tree-expansion';
import { StructuredSelection } from '../../common/selection';
import { MockTreeSelectionService } from './test/mock-tree-selection';
import { SelectableTreeNode, TreeSelectionService } from './tree-selection';

disableJSDOM();

describe('tree-selection', () => {

    describe('select-node [single, multi-individual]', () => {

        interface Input {
            readonly initialState: string[];
            readonly selection: string;
            readonly selectionType: StructuredSelection.SelectionType;
            readonly expectation: string[];
        }

        ([
            {
                initialState: ['A'],
                selection: 'A',
                selectionType: StructuredSelection.SelectionType.SINGLE,
                expectation: ['A']
            },
            {
                initialState: ['A'],
                selection: 'A',
                selectionType: StructuredSelection.SelectionType.MULTI_INDIVIDUAL,
                expectation: ['A']
            },
            {
                initialState: ['A'],
                selection: 'X',
                selectionType: StructuredSelection.SelectionType.SINGLE,
                expectation: ['X']
            },
            {
                initialState: ['A'],
                selection: 'X',
                selectionType: StructuredSelection.SelectionType.MULTI_INDIVIDUAL,
                expectation: ['X', 'A']
            },
            // --------------------------------
            {
                initialState: ['B', 'A'],
                selection: 'A',
                selectionType: StructuredSelection.SelectionType.SINGLE,
                expectation: ['A']
            },
            {
                initialState: ['B', 'A'],
                selection: 'A',
                selectionType: StructuredSelection.SelectionType.MULTI_INDIVIDUAL,
                expectation: ['A', 'B']
            },
            {
                initialState: ['B', 'A'],
                selection: 'X',
                selectionType: StructuredSelection.SelectionType.SINGLE,
                expectation: ['X']
            },
            {
                initialState: ['B', 'A'],
                selection: 'X',
                selectionType: StructuredSelection.SelectionType.MULTI_INDIVIDUAL,
                expectation: ['X', 'B', 'A']
            },
            // --------------------------------
            {
                initialState: [],
                selection: 'A',
                selectionType: StructuredSelection.SelectionType.SINGLE,
                expectation: ['A']
            },
            {
                initialState: [],
                selection: 'A',
                selectionType: StructuredSelection.SelectionType.MULTI_INDIVIDUAL,
                expectation: ['A']
            }
        ] as Input[]).forEach(test => {

            const selectedNodes = JSON.stringify(test.initialState);
            const selectionType = StructuredSelection.SelectionType.toString(test.selectionType);
            const expectedNodes = JSON.stringify(test.expectation);

            it(`Selected nodes: ${selectedNodes} => Select: [${test.selection}, selection type: ${selectionType}] => Expected: ${expectedNodes}`, () => {
                const nodes = test.initialState.map(id => createTreeNode(id, true));
                const selection = nodes.find(n => n.id === test.selection) || createTreeNode(test.selection, false);
                const service = new MockTreeSelectionService(nodes);
                service.selectNode(selection!, { selectionType: test.selectionType });
                const actual = service.selectedNodes;
                const expected = test.expectation.map(id => nodes.find(n => n.id === id) || createTreeNode(id, true));
                expect(actual).to.be.deep.equal(expected, `Expected: ${JSON.stringify(expected)}, actual: ${JSON.stringify(actual)}`);
            });

        });

    });

    describe('select-node [single, multi-range]', () => {

        const container = createTreeContainer(new Container({ defaultScope: 'Singleton' }));
        const model = container.get(TreeModelImpl);
        const selectionService: TreeSelectionService = container.get(TreeSelectionService);
        const findNode = (id: string) => model.getNode(id) as (SelectableTreeNode & ExpandableTreeNode);

        before(() => {
            model.root = MOCK_ROOT;
            selectionService.unselectNode(undefined);
        });

        it('jaj', () => {
            selectionService.selectNode(findNode('1'));
            expect(selectionService.selectedNodes).to.have.lengthOf(1);
        });

    });

});

function createTreeNode(id: string, selected: boolean): SelectableTreeNode {
    return {
        id,
        name: id,
        selected,
        parent: undefined
    };
}
