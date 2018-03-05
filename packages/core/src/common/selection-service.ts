/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Emitter, Event } from '../common/event';
import { injectable } from "inversify";
import { ReadonlyArrayLike } from '@theia/core';

export interface SelectionProvider<T> {
    onSelectionChanged: Event<T | undefined>;
}

// TODO: do we need this?
export type Selection = Object | undefined;

@injectable()
export class SelectionService implements SelectionProvider<any> {

    constructor() { }

    private currentSelection: any;
    private selectionListeners: Emitter<any> = new Emitter();

    get selection(): any {
        return this.currentSelection;
    }

    set selection(selection: any) {
        this.currentSelection = selection;
        this.selectionListeners.fire(this.currentSelection);
    }

    get onSelectionChanged(): Event<any> {
        return this.selectionListeners.event;
    }
}

/**
 * Representation of a structured selection, that could wrap zero to many selected items.
 * When nothing is selected, and the structured selection is empty, accessing any of
 * the contained items will result in `undefined`.
 */
export interface StructuredSelection<T> extends ReadonlyArrayLike<T>, Iterable<Readonly<T>> {

}

export namespace StructuredSelection {

    /**
     * `true` if the argument is a structured selection. Otherwise, `false`.
     */
    // tslint:disable-next-line:no-any
    export function is<T>(arg: any): arg is StructuredSelection<T> {
        return !!arg && 'length' in arg && typeof arg['length'] === 'number';
    }

    /**
     * `true` if the selection is empty. Otherwise, `false`.
     */
    export function isEmpty<T>(selection: StructuredSelection<T>): boolean {
        return selection.length === 0;
    }

    /**
     * `true` if the selection wraps exactly one selected items. Otherwise, `false`.
     */
    export function isSingle<T>(selection: StructuredSelection<T>): boolean {
        return selection.length === 1;
    }

    /**
     * Returns with the first item of the structured selection, or `undefined` if the selection was empty.
     */
    export function firstItem<T>(selection: StructuredSelection<T>): T | undefined {
        return selection[0];
    }

}
