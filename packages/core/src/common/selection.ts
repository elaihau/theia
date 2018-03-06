/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import URI from './uri';

/**
 * Representation of a structured selection, that could wrap zero to many selected items.
 * When nothing is selected, and the structured selection is empty, accessing any of
 * the contained items will result in `undefined`.
 */
export interface StructuredSelection<T> extends ReadonlyArray<Readonly<T>> {
}

export namespace StructuredSelection {

    /**
     * Enumerations for the supported select types.
     */
    export enum SelectionType {

        /**
         * Single selection.
         */
        SINGLE,

        /**
         * Multi-selection. When selecting an individual item with the `Ctrl` (on Windows and Linux) and `Cmd` (on OS X) key mask.
         */
        MULTI_INDIVIDUAL,

        /**
         * Multi-selection. When selecting a range of items with the `Shift` key mask.
         */
        MULTI_RANGE

    }

    export namespace SelectionType {

        /**
         * `true` if the argument is either an individual or a range multi selection type.
         */
        export function isMulti(type: SelectionType | undefined): boolean {
            return type === SelectionType.MULTI_INDIVIDUAL || type === SelectionType.MULTI_RANGE;
        }

        export function toString(type: SelectionType): string {
            switch (type) {
                case SelectionType.SINGLE: return 'single';
                case SelectionType.MULTI_INDIVIDUAL: return 'multi-individual';
                case SelectionType.MULTI_RANGE: return 'multi-range';
                default: throw new Error(`Unexpected selection type: ${type}`);
            }
        }

    }

    /**
     * `true` if the argument is a structured selection. Otherwise, `false`.
     */
    // tslint:disable-next-line:no-any
    export function is<T>(arg: any): arg is StructuredSelection<T> {
        return Array.isArray(arg);
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

export interface UriSelection {
    readonly uri: URI
}

export namespace UriSelection {

    // tslint:disable-next-line:no-any
    export function is(arg: any): arg is UriSelection {
        return !!arg && arg['uri'] instanceof URI;
    }

    // tslint:disable-next-line:no-any
    export function getUri(selection: any): URI | undefined {
        if (UriSelection.is(selection)) {
            return selection.uri;
        }
        return undefined;
    }

}
