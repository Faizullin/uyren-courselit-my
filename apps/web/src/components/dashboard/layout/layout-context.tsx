"use client";

import { generateUniqueId } from "@workspace/utils";
import { createContext, useContext, useMemo, useState } from "react";

type Crumb = {
    id: string;
    label: string;
    href: string;
}

class CrumbController {
    private crumbs: Crumb[] = [];
    private setCrumbs: React.Dispatch<React.SetStateAction<Crumb[]>>;

    constructor(setCrumbs: React.Dispatch<React.SetStateAction<Crumb[]>>) {
        this.setCrumbs = setCrumbs;
    }

    addCrumb = (crumb: Omit<Crumb, "id"> & { id?: string }) => {
        const newCrumb = {
            id: crumb.id || generateUniqueId(),
            label: crumb.label,
            href: crumb.href,
        };
        this.setCrumbs((prev) => [...prev, newCrumb]);
    };

    removeCrumb = (id: string) => {
        this.setCrumbs((prev) => prev.filter((crumb) => crumb.id !== id));
    };

    updateCrumb = (id: string, updatedCrumb: Crumb) => {
        this.setCrumbs((prev) => prev.map((crumb) => crumb.id === id ? updatedCrumb : crumb));
    };

    getCrumbs = () => {
        return this.crumbs;
    };

    setCrumbsState = (crumbs: Crumb[]) => {
        this.crumbs = crumbs;
    };
}

type LayoutContextType = {
    breadcrumbs: {
        controller: CrumbController;
        crumbs: Crumb[];
    }
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export const LayoutContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [crumbs, setCrumbs] = useState<Crumb[]>([]);
    
    const controller = useMemo(() => {
        const ctrl = new CrumbController(setCrumbs);
        ctrl.setCrumbsState(crumbs);
        return ctrl;
    }, [crumbs]);
    
    return <LayoutContext.Provider value={{ breadcrumbs: { controller, crumbs } }}>{children}</LayoutContext.Provider>;
}

export const useLayoutContext = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayoutContext must be used within a LayoutContextProvider");
    }
    return context;
}