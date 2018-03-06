/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, postConstruct } from "inversify";
import { Message } from "@phosphor/messaging";
import { ElementExt } from "@phosphor/domutils";
import { h, ElementAttrs, ElementInlineStyle } from "@phosphor/virtualdom";
import { Disposable, MenuPath } from "../../common";
import { Key } from "../keys";
import { ContextMenuRenderer } from "../context-menu-renderer";
import { StatefulWidget } from '../shell';
import { VirtualWidget, VirtualRenderer, SELECTED_CLASS, COLLAPSED_CLASS } from "../widgets";
import { TreeNode, CompositeTreeNode } from "./tree";
import { TreeModel } from "./tree-model";
import { ExpandableTreeNode } from "./tree-expansion";
import { SelectableTreeNode } from "./tree-selection";
import { TreeDecoration, TreeDecoratorService } from "./tree-decorator";
import { notEmpty } from '../../common/objects';
import { isOSX } from '../../common/os';
import { StructuredSelection } from '../../common/selection';

export const TREE_CLASS = 'theia-Tree';
export const TREE_NODE_CLASS = 'theia-TreeNode';
export const TREE_NODE_TAIL_CLASS = 'theia-TreeNodeTail';
export const TREE_NODE_SEGMENT_CLASS = 'theia-TreeNodeSegment';
export const TREE_NODE_SEGMENT_GROW_CLASS = 'theia-TreeNodeSegmentGrow';

export const EXPANDABLE_TREE_NODE_CLASS = 'theia-ExpandableTreeNode';
export const COMPOSITE_TREE_NODE_CLASS = 'theia-CompositeTreeNode';
export const TREE_NODE_CAPTION_CLASS = 'theia-TreeNodeCaption';
export const EXPANSION_TOGGLE_CLASS = 'theia-ExpansionToggle';

export const TreeProps = Symbol('TreeProps');
export interface TreeProps {

    /**
     * The path of the context menu that one can use to contribute context menu items to the tree widget.
     */
    readonly contextMenuPath?: MenuPath;

    /**
     * The size of the padding (in pixels) per hierarchy depth. The root element won't have left padding but
     * the padding for the children will be calculated as `leftPadding * hierarchyDepth` and so on.
     */
    readonly leftPadding: number;

    /**
     * `true` if the tree widget support multi-selection. Otherwise, `false`. Defaults to `false`.
     */
    readonly multiSelect?: boolean;
}

export interface NodeProps {

    /**
     * A root relative number representing the hierarchical depth of the actual node. Root is `0`, its children have `1` and so on.
     */
    readonly depth: number;

    /**
     * Tests whether the node should be rendered as hidden.
     *
     * It is different from visibility of a node: an invisible node is not rendered at all.
     */
    readonly visible: boolean;

}

export const defaultTreeProps: TreeProps = {
    leftPadding: 16
};

@injectable()
export class TreeWidget extends VirtualWidget implements StatefulWidget {

    @inject(TreeDecoratorService)
    protected readonly decoratorService: TreeDecoratorService;

    protected decorations: Map<string, TreeDecoration.Data[]> = new Map();

    constructor(
        @inject(TreeProps) readonly props: TreeProps,
        @inject(TreeModel) readonly model: TreeModel,
        @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer,
    ) {
        super();
        this.scrollOptions = {
            suppressScrollX: true
        };
        this.addClass(TREE_CLASS);
        this.node.tabIndex = 0;
        model.onChanged(() => this.update());
        this.toDispose.push(model);
    }

    @postConstruct()
    protected init() {
        this.toDispose.pushAll([
            this.decoratorService.onDidChangeDecorations(op => this.updateDecorations(op(this.model))),
            this.model.onNodeRefreshed(() => this.updateDecorations(this.decoratorService.getDecorations(this.model))),
            this.model.onExpansionChanged(() => this.updateDecorations(this.decoratorService.getDecorations(this.model)))
        ]);
    }

    protected updateDecorations(decorations: Map<string, TreeDecoration.Data[]>) {
        this.decorations = decorations;
        this.update();
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        if (!this.model.selectedNodes && SelectableTreeNode.is(this.model.root)) {
            this.model.selectNode(this.model.root);
        }
        this.node.focus();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);

        const selected = this.node.getElementsByClassName(SELECTED_CLASS)[0];
        if (selected) {
            ElementExt.scrollIntoViewIfNeeded(this.node, selected);
        }
    }

    protected render(): h.Child {
        return this.renderTree(this.model);
    }

    protected renderTree(model: TreeModel): h.Child {
        if (model.root) {
            const props = this.createRootProps(model.root);
            return this.renderSubTree(model.root, props);
        }
        // tslint:disable-next-line:no-null-keyword
        return null;
    }

    protected createRootProps(node: TreeNode): NodeProps {
        return {
            depth: 0,
            visible: true
        };
    }

    protected renderSubTree(node: TreeNode, props: NodeProps): h.Child {
        const children = this.renderNodeChildren(node, props);
        if (!TreeNode.isVisible(node)) {
            return children;
        }
        const parent = this.renderNode(node, props);
        return VirtualRenderer.merge(parent, children);
    }

    protected renderIcon(node: TreeNode, props: NodeProps): h.Child {
        // tslint:disable-next-line:no-null-keyword
        return null;
    }

    protected renderExpansionToggle(node: TreeNode, props: NodeProps): h.Child {
        if (!this.isExpandable(node)) {
            // tslint:disable-next-line:no-null-keyword
            return null;
        }
        const classes = [TREE_NODE_SEGMENT_CLASS, EXPANSION_TOGGLE_CLASS];
        if (!node.expanded) {
            classes.push(COLLAPSED_CLASS);
        }
        const className = classes.join(' ');
        return h.div({
            className,
            style: {
                paddingLeft: '4px',
                paddingRight: '4px',
                width: '0.5em'
            },
            onclick: event => {
                this.handleClickEvent(node, event);
                event.stopPropagation();
            }
        });
    }

    protected renderCaption(node: TreeNode, props: NodeProps): h.Child {
        const tooltip = this.getDecorationData(node, 'tooltip').filter(notEmpty).join(' • ');
        const classes = [TREE_NODE_SEGMENT_CLASS];
        if (!this.hasTrailingSuffixes(node)) {
            classes.push(TREE_NODE_SEGMENT_GROW_CLASS);
        }
        const className = classes.join(' ');
        let attrs = this.decorateCaption(node, {
            className
        });
        if (tooltip.length > 0) {
            attrs = {
                ...attrs,
                title: tooltip
            };
        }
        return h.div(attrs, node.name);
    }

    protected decorateCaption(node: TreeNode, attrs: ElementAttrs): ElementAttrs {
        const style = this.getDecorationData(node, 'fontData').filter(notEmpty).reverse().map(fontData => this.applyFontStyles({}, fontData)).reduce((acc, current) =>
            ({
                ...acc,
                ...current
            })
            , {});
        return {
            ...attrs,
            style
        };
    }

    protected hasTrailingSuffixes(node: TreeNode): boolean {
        return this.getDecorationData(node, 'captionSuffixes').filter(notEmpty).reduce((acc, current) => acc.concat(current), []).length > 0;
    }

    protected applyFontStyles(original: ElementInlineStyle, fontData: TreeDecoration.FontData | undefined) {
        if (fontData === undefined) {
            return original;
        }
        let modified = original;
        const { color, style } = fontData;
        if (color) {
            modified = {
                ...modified,
                color
            };
        }
        if (style) {
            (Array.isArray(style) ? style : [style]).forEach(s => {
                switch (style) {
                    case 'bold':
                        modified = {
                            ...modified,
                            fontWeight: style
                        };
                        break;
                    case 'normal': // Fall through.
                    case 'oblique': // Fall through.
                    case 'italic':
                        modified = {
                            ...modified,
                            fontStyle: style
                        };
                        break;
                    case 'underline': // Fall through.
                    case 'line-through':
                        modified = {
                            ...modified,
                            textDecoration: style
                        };
                        break;
                    default:
                        throw new Error(`Unexpected font style: ${style}.`);
                }
            });
        }
        return modified;
    }

    protected renderCaptionAffixes(node: TreeNode, props: NodeProps, affixKey: 'captionPrefixes' | 'captionSuffixes'): h.Child[] {
        const suffix = affixKey === 'captionSuffixes';
        const affixClass = suffix ? TreeDecoration.Styles.CAPTION_SUFFIX_CLASS : TreeDecoration.Styles.CAPTION_PREFIX_CLASS;
        const classes = [TREE_NODE_SEGMENT_CLASS, affixClass];
        const affixes = this.getDecorationData(node, affixKey).filter(notEmpty).reduce((acc, current) => acc.concat(current), []);
        const children: h.Child[] = [];
        for (let i = 0; i < affixes.length; i++) {
            const affix = affixes[i];
            if (suffix && i === affixes.length - 1) {
                classes.push(TREE_NODE_SEGMENT_GROW_CLASS);
            }
            const style = this.applyFontStyles({}, affix.fontData);
            const className = classes.join(' ');
            const attrs = {
                className,
                style
            };
            children.push(h.div(attrs, affix.data));
        }
        return children;
    }

    protected decorateIcon(node: TreeNode, icon: h.Child | null): h.Child {
        if (icon === null) {
            // tslint:disable-next-line:no-null-keyword
            return null;
        }

        const overlayIcons: h.Child = [];
        new Map(this.getDecorationData(node, 'iconOverlay').reverse().filter(notEmpty)
            .map(overlay => [overlay.position, overlay] as [TreeDecoration.IconOverlayPosition, TreeDecoration.IconOverlay]))
            .forEach((overlay, position) => {
                const overlayClass = (iconName: string) =>
                    ['a', 'fa', `fa-${iconName}`, TreeDecoration.Styles.DECORATOR_SIZE_CLASS, TreeDecoration.IconOverlayPosition.getStyle(position)].join(' ');
                const style = (color?: string) => color === undefined ? {} : { color };
                if (overlay.background) {
                    overlayIcons.push(h.span({ className: overlayClass(overlay.background.shape), style: style(overlay.background.color) }));
                }
                overlayIcons.push(h.span({ className: overlayClass(overlay.icon), style: style(overlay.color) }));
            });

        if (overlayIcons.length > 0) {
            return h.div({ className: TreeDecoration.Styles.ICON_WRAPPER_CLASS }, VirtualRenderer.merge(icon, overlayIcons));
        }

        return icon;
    }

    protected renderTailDecorations(node: TreeNode, props: NodeProps): h.Child[] {
        const style = (fontData: TreeDecoration.FontData | undefined) => this.applyFontStyles({}, fontData);
        return this.getDecorationData(node, 'tailDecorations').filter(notEmpty).reduce((acc, current) => acc.concat(current), []).map(decoration => {
            const { fontData, data, tooltip } = decoration;
            return h.div({
                className: [TREE_NODE_SEGMENT_CLASS, TREE_NODE_TAIL_CLASS].join(' '),
                style: style(fontData),
                title: tooltip
            }, data);
        });
    }

    protected renderNode(node: TreeNode, props: NodeProps): h.Child {
        const attributes = this.createNodeAttributes(node, props);
        return h.div(attributes,
            this.renderExpansionToggle(node, props),
            this.decorateIcon(node, this.renderIcon(node, props)),
            ...this.renderCaptionAffixes(node, props, 'captionPrefixes'),
            this.renderCaption(node, props),
            ...this.renderCaptionAffixes(node, props, 'captionSuffixes'),
            ...this.renderTailDecorations(node, props));
    }

    protected createNodeAttributes(node: TreeNode, props: NodeProps): ElementAttrs {
        const className = this.createNodeClassNames(node, props).join(' ');
        const style = this.createNodeStyle(node, props);
        return {
            className,
            style,
            onclick: event => this.handleClickEvent(node, event),
            ondblclick: event => this.handleDblClickEvent(node, event),
            oncontextmenu: event => this.handleContextMenuEvent(node, event),
        };
    }

    protected createNodeClassNames(node: TreeNode, props: NodeProps): string[] {
        const classNames = [TREE_NODE_CLASS];
        if (CompositeTreeNode.is(node)) {
            classNames.push(COMPOSITE_TREE_NODE_CLASS);
        }
        if (this.isExpandable(node)) {
            classNames.push(EXPANDABLE_TREE_NODE_CLASS);
        }
        if (SelectableTreeNode.isSelected(node)) {
            classNames.push(SELECTED_CLASS);
        }
        return classNames;
    }

    protected getDefaultNodeStyle(node: TreeNode, props: NodeProps): ElementInlineStyle | undefined {
        let style: ElementInlineStyle = {
            paddingLeft: `${props.depth * this.props.leftPadding}px`
        };
        if (!props.visible) {
            style = {
                ...style,
                display: 'none'
            };
        }
        return style;
    }

    protected createNodeStyle(node: TreeNode, props: NodeProps): ElementInlineStyle | undefined {
        return this.decorateNodeStyle(node, this.getDefaultNodeStyle(node, props));
    }

    protected decorateNodeStyle(node: TreeNode, style: ElementInlineStyle | undefined): ElementInlineStyle | undefined {
        const backgroundColor = this.getDecorationData(node, 'backgroundColor').filter(notEmpty).shift();
        if (backgroundColor) {
            style = {
                ...(style || {}),
                backgroundColor
            };
        }
        return style;
    }

    protected isExpandable(node: TreeNode): node is ExpandableTreeNode {
        return ExpandableTreeNode.is(node);
    }

    protected renderNodeChildren(node: TreeNode, props: NodeProps): h.Child {
        if (CompositeTreeNode.is(node)) {
            return this.renderCompositeChildren(node, props);
        }
        // tslint:disable-next-line:no-null-keyword
        return null;
    }

    protected renderCompositeChildren(parent: CompositeTreeNode, props: NodeProps): h.Child {
        return VirtualRenderer.flatten(parent.children.map(child => this.renderChild(child, parent, props)));
    }

    protected renderChild(child: TreeNode, parent: CompositeTreeNode, props: NodeProps): h.Child {
        const childProps = this.createChildProps(child, parent, props);
        return this.renderSubTree(child, childProps);
    }

    protected createChildProps(child: TreeNode, parent: CompositeTreeNode, props: NodeProps): NodeProps {
        if (this.isExpandable(parent)) {
            return this.createExpandableChildProps(child, parent, props);
        }
        return props;
    }

    protected createExpandableChildProps(child: TreeNode, parent: ExpandableTreeNode, props: NodeProps): NodeProps {
        if (!props.visible) {
            return props;
        }
        const visible = parent.expanded;
        const depth = props.depth + 1;
        return { ...props, visible, depth };
    }

    protected getDecorations(node: TreeNode): TreeDecoration.Data[] {
        const decorations = this.decorations.get(node.id);
        if (decorations) {
            return decorations.sort(TreeDecoration.Data.comparePriority);
        }
        return [];
    }

    protected getDecorationData<K extends keyof TreeDecoration.Data>(node: TreeNode, key: K): TreeDecoration.Data[K][] {
        return this.getDecorations(node).filter(data => data[key] !== undefined).map(data => data[key]).filter(notEmpty);
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addKeyListener(this.node, Key.ARROW_LEFT, () => this.handleLeft());
        this.addKeyListener(this.node, Key.ARROW_RIGHT, () => this.handleRight());
        this.addKeyListener(this.node, Key.ARROW_UP, () => this.handleUp());
        this.addKeyListener(this.node, Key.ARROW_DOWN, () => this.handleDown());
        this.addKeyListener(this.node, Key.ENTER, () => this.handleEnter());
        this.addEventListener(this.node, 'contextmenu', e => this.handleContextMenuEvent(this.model.root, e));
        this.addEventListener(this.node, 'click', e => this.handleClickEvent(this.model.root, e));
    }

    protected handleLeft(): void {
        if (!this.model.collapseNode()) {
            this.model.selectParent();
        }
    }

    protected handleRight(): void {
        if (!this.model.expandNode()) {
            this.model.selectNextNode();
        }
    }

    protected handleUp(): void {
        this.model.selectPrevNode();
    }

    protected handleDown(): void {
        this.model.selectNextNode();
    }

    protected handleEnter(): void {
        this.model.openNode();
    }

    protected handleClickEvent(node: TreeNode | undefined, event: MouseEvent): void {
        if (node) {
            if (!!this.props.multiSelect) {
                const selectionType = this.getSelectionType(event);
                const multi = StructuredSelection.SelectionType.isMulti(selectionType);
                if (SelectableTreeNode.is(node)) {
                    if (multi && node.selected) {
                        this.model.unselectNode(node);
                    } else {
                        this.model.selectNode(node, { selectionType });
                    }
                }
                if (!multi && this.isExpandable(node)) {
                    this.model.toggleNodeExpansion(node);
                }
            } else {
                if (SelectableTreeNode.is(node)) {
                    this.model.selectNode(node);
                }
                if (this.isExpandable(node)) {
                    this.model.toggleNodeExpansion(node);
                }
            }
            event.stopPropagation();
        }
    }

    protected handleDblClickEvent(node: TreeNode | undefined, event: MouseEvent): void {
        this.model.openNode(node);
        event.stopPropagation();
    }

    protected handleContextMenuEvent(node: TreeNode | undefined, event: MouseEvent): void {
        if (SelectableTreeNode.is(node)) {
            // Keep the selection for the context menu, if the widget support multi-selection and the right click happens on an already selected node.
            const selectionType = !!this.props.multiSelect && node.selected ? StructuredSelection.SelectionType.MULTI_INDIVIDUAL : StructuredSelection.SelectionType.SINGLE;
            this.model.selectNode(node, { selectionType });
            const contextMenuPath = this.props.contextMenuPath;
            if (contextMenuPath) {
                this.onRender.push(Disposable.create(() =>
                    setTimeout(() =>
                        this.contextMenuRenderer.render(contextMenuPath, event)
                    )
                ));
            }
            this.update();
        }
        event.stopPropagation();
        event.preventDefault();
    }

    protected getSelectionType(event: MouseEvent): StructuredSelection.SelectionType {
        const { shiftKey, metaKey, ctrlKey } = event;
        if ((isOSX && metaKey) || ctrlKey) {
            return StructuredSelection.SelectionType.MULTI_INDIVIDUAL;
        }
        if (shiftKey) {
            return StructuredSelection.SelectionType.MULTI_RANGE;
        }
        return StructuredSelection.SelectionType.SINGLE;
    }

    protected deflateForStorage(node: TreeNode): object {
        // tslint:disable-next-line:no-any
        const copy = Object.assign({}, node) as any;
        if (copy.parent) {
            delete copy.parent;
        }
        if (CompositeTreeNode.is(node)) {
            copy.children = [];
            for (const child of node.children) {
                copy.children.push(this.deflateForStorage(child));
            }
        }
        return copy;
    }

    // tslint:disable-next-line:no-any
    protected inflateFromStorage(node: any, parent?: TreeNode): TreeNode {
        if (node.selected) {
            node.selected = false;
        }
        if (parent) {
            node.parent = parent;
        }
        if (Array.isArray(node.children)) {
            for (const child of node.children as TreeNode[]) {
                this.inflateFromStorage(child, node);
            }
        }
        return node;
    }

    storeState(): object {
        const decorations = this.decoratorService.deflateDecorators(this.decorations);
        let state: object = {
            decorations
        };
        if (this.model.root) {
            state = {
                ...state,
                root: this.deflateForStorage(this.model.root)
            };
        }
        return state;
    }

    restoreState(oldState: object): void {
        // tslint:disable-next-line:no-any
        const { root, decorations } = (oldState as any);
        if (root) {
            this.model.root = this.inflateFromStorage(root);
        }
        if (decorations) {
            this.updateDecorations(this.decoratorService.inflateDecorators(decorations));
        }
    }

}
