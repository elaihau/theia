/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import URI from './uri';
import { ReadonlyArrayLike } from './types';

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
