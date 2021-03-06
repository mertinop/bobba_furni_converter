import { parseXml, parseXmlArray } from "./utils";

//assets
export type FurniOffsetAsset = {
    name: string,
    exists: boolean,
    x: number,
    y: number,
    flipH?: number,
    source?: string,
};

export type FurniOffsetAssetDictionary = {
    [id: string]: FurniOffsetAsset;
};

//logic
export type FurniOffsetLogic = {
    dimensions: { x: number, y: number, z: number },
    directions: number[],
};

//export type FurniOffsetLogicType = "furniture_multistate" | "furniture_basic" | "furniture_animated";

//index
export type FurniOffsetIndex = {
    type: string,
    visualization: string,
    logic: string,
};

//visualization
export type FurniOffsetVisualizationColorData = {
    layerId: number,
    color: string,
};
export type FurniOffsetVisualizationColor = {
    [colorId: string]: FurniOffsetVisualizationColorData[],
};
export type FurniOffsetVisualizationLayerData = {
    layerId: number,
    ink?: string,
    alpha?: number,
    ignoreMouse?: number,
    z?: number,
};
export type FurniOffsetAnimationLayer = {
    layerId: number,
    frameSequence: number[][],
};
export type FurniOffsetVisualizationAnimation = {
    id: number,
    transitionTo?: number,
    layers: FurniOffsetAnimationLayer[],
};
export type FurniOffsetVisualizationData = {
    angle: number,
    layerCount: number,
    size: number,
    directions: { [directionId: number]: FurniOffsetVisualizationLayerData[] },
    layers?: FurniOffsetVisualizationLayerData[],
    colors?: FurniOffsetVisualizationColor,
    animations?: { [animationId: number]: FurniOffsetVisualizationAnimation },
};
export type FurniOffsetVisualization = {
    1: FurniOffsetVisualizationData,
    32?: FurniOffsetVisualizationData,
    64: FurniOffsetVisualizationData,
};

//furni.json
export type FurniOffset = {
    assets: FurniOffsetAssetDictionary;
    visualization: FurniOffsetVisualization;
    logic: FurniOffsetLogic;
    index: FurniOffsetIndex;
};

const generateAssetsFromXml = (rawXml: string, folderAssets: string[]): FurniOffsetAssetDictionary | null => {
    const parsed = parseXml(rawXml);
    const assetDictionary: FurniOffsetAssetDictionary = {};

    if (parsed != null) {
        const assets = parseXmlArray(parsed.assets.asset);
        assets.forEach(rawAsset => {
            const exists = folderAssets.find(value => value.includes(rawAsset.name)) != null;
            const data: FurniOffsetAsset = {
                name: rawAsset.name,
                flipH: rawAsset.flipH,
                source: rawAsset.source,
                x: rawAsset.x,
                y: rawAsset.y,
                exists,
            };

            assetDictionary[data.name] = data;
        });

        return assetDictionary;
    }
    return null;
};

const generateLogicFromXml = (rawXml: string): FurniOffsetLogic | null => {
    const parsed = parseXml(rawXml);
    if (parsed != null) {
        const rawLogic = parsed.objectData;
        const directions: number[] = [];
        if (rawLogic.model.directions != null) {
            const rawDirections = parseXmlArray(rawLogic.model.directions.direction);
            rawDirections.forEach(rawDir => {
                directions.push(rawDir.id);
            });
        }

        const logic: FurniOffsetLogic = {
            //type: rawLogic.type,
            dimensions: {
                x: rawLogic.model.dimensions.x,
                y: rawLogic.model.dimensions.y,
                z: rawLogic.model.dimensions.z,
            },
            directions
        };
        return logic;
    }
    return null;
};

const generateIndexFromXml = (rawXml: string): FurniOffsetIndex | null => {
    const parsed = parseXml(rawXml);
    if (parsed != null && parsed.object != null) {
        return {
            logic: parsed.object.logic,
            type: parsed.object.type,
            visualization: parsed.object.visualization,
        };
    }
    return null;
};

const generateVisualizationFromXml = (rawXml: string): FurniOffsetVisualization | null => {
    const parsed = parseXml(rawXml);
    if (parsed != null) {
        const rawVisualization = parsed.visualizationData.graphics != null ? parseXmlArray(parsed.visualizationData.graphics.visualization) : parseXmlArray(parsed.visualizationData.visualization);
        const parsedVisualizations = rawVisualization.map(rawVisualizationData => {
            const visualizationData: FurniOffsetVisualizationData = {
                angle: rawVisualizationData.angle,
                layerCount: rawVisualizationData.layerCount,
                size: rawVisualizationData.size,
                directions: {},
                //layers: [],
                //animations: {},
                //colors: {},
            };

            if (rawVisualizationData.directions != null && rawVisualizationData.directions.direction != null) {
                const rawDirections = parseXmlArray(rawVisualizationData.directions.direction);
                rawDirections.forEach(direction => {
                    visualizationData.directions[direction.id] = [];
                });
            }

            if (rawVisualizationData.colors != null && rawVisualizationData.colors.color != null) {
                const rawColors = parseXmlArray(rawVisualizationData.colors.color);
                const allegedColors: FurniOffsetVisualizationColor = {};
                rawColors.forEach(color => {
                    allegedColors[color.id] = [];
                    const colorLayers = parseXmlArray(color.colorLayer);
                    colorLayers.forEach(rawColorLayer => {
                        allegedColors[color.id].push({
                            layerId: rawColorLayer.id,
                            color: rawColorLayer.color,
                        });
                    });
                });
                visualizationData.colors = allegedColors;
            }

            if (rawVisualizationData.animations != null && rawVisualizationData.animations.animation != null) {
                const rawAnimations = parseXmlArray(rawVisualizationData.animations.animation);
                const allegedAnimations: { [animationId: string]: FurniOffsetVisualizationAnimation } = {};

                rawAnimations.forEach(animation => {
                    const animationLayers = parseXmlArray(animation.animationLayer);
                    const layers: FurniOffsetAnimationLayer[] = [];

                    animationLayers.forEach(animationLayer => {
                        const rawFrameSequences = parseXmlArray(animationLayer.frameSequence);
                        const frameSequence = rawFrameSequences.map(rawFrameSequence => {
                            const actualSequences = parseXmlArray(rawFrameSequence.frame);
                            return actualSequences.map(layer => {
                                return layer.id as number;
                            });
                        });

                        layers.push({
                            layerId: animationLayer.id,
                            frameSequence,
                        });
                    });

                    allegedAnimations[animation.id] = {
                        id: animation.id,
                        layers,
                    };
                });

                visualizationData.animations = allegedAnimations;
            }

            if (rawVisualizationData.layers != null && rawVisualizationData.layers.layer != null) {
                const rawLayers = parseXmlArray(rawVisualizationData.layers.layer);
                const allegedLayers: FurniOffsetVisualizationLayerData[] = [];
                rawLayers.forEach(rawLayer => {
                    allegedLayers.push({
                        layerId: rawLayer.id,
                        ink: rawLayer.ink,
                        alpha: rawLayer.alpha,
                        ignoreMouse: rawLayer.ignoreMouse,
                        z: rawLayer.z
                    });
                });
                visualizationData.layers = allegedLayers;
            }

            return visualizationData;
        });

        const icon = parsedVisualizations.find(value => value.size === 1);
        const small = parsedVisualizations.find(value => value.size === 32);
        const large = parsedVisualizations.find(value => value.size === 64);
        if (icon != null && large != null) {
            return {
                1: icon,
                32: small,
                64: large,
            }
        }
    }
    return null;
};

export const generateOffsetFromXml = (assetsXml: string, logicXml: string, visualizationXml: string, indexXml: string, folderAssets: string[]): FurniOffset | null => {
    const assets = generateAssetsFromXml(assetsXml, folderAssets);
    const logic = generateLogicFromXml(logicXml);
    const visualization = generateVisualizationFromXml(visualizationXml);
    const index = generateIndexFromXml(indexXml);

    if (assets != null && logic != null && visualization != null && index != null) {
        return {
            assets,
            logic,
            visualization,
            index
        };
    }
    return null;
};