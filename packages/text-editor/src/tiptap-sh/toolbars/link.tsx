"use client";
/* eslint-disable */
// @ts-nocheck
import { PopoverClose } from "@radix-ui/react-popover";
import { Trash2, X } from "lucide-react";

import React, { type FormEvent } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useToolbar } from "./toolbar-provider";
import { getUrlFromString } from "../lib/tiptap-utils";

const LinkToolbar = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
	({ className, ...props }, ref) => {
		const { editor } = useToolbar();
		const [link, setLink] = React.useState("");

		const handleSubmit = (e: FormEvent) => {
			e.preventDefault();
			const url = getUrlFromString(link);
			url && editor?.chain().focus().setLink({ href: url }).run();
		};

		React.useEffect(() => {
			setLink(editor?.getAttributes("link").href ?? "");
		}, [editor]);

		return (
			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger
							disabled={!editor?.can().chain().setLink({ href: "" }).run()}
							asChild
						>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"h-8 w-max px-3 font-normal",
									editor?.isActive("link") && "bg-accent",
									className,
								)}
								ref={ref}
								{...props}
							>
								<p className="mr-2 text-base">↗</p>
								<p className={"underline decoration-gray-7 underline-offset-4"}>
									Link
								</p>
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>
						<span>Link</span>
					</TooltipContent>
				</Tooltip>

				<PopoverContent
					onCloseAutoFocus={(e) => {
						e.preventDefault();
					}}
					asChild
					className="relative px-3 py-2.5"
				>
					<div className="relative">
						<PopoverClose className="absolute right-3 top-3">
							<X className="h-4 w-4" />
						</PopoverClose>
						<form onSubmit={handleSubmit}>
							<Label>Link</Label>
							<p className="text-sm text-gray-11">
								Attach a link to the selected text
							</p>
							<div className="mt-3 flex flex-col items-end justify-end gap-3">
								<Input
									value={link}
									onChange={(e) => {
										setLink(e.target.value);
									}}
									className="w-full"
									placeholder="https://example.com"
								/>
								<div className="flex items-center gap-3">
									{editor?.getAttributes("link").href && (
										<Button
											type="reset"
											size="sm"
											className="h-8 text-gray-11"
											variant="ghost"
											onClick={() => {
												editor?.chain().focus().unsetLink().run();
												setLink("");
											}}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Remove
										</Button>
									)}
									<Button size="sm" className="h-8">
										{editor?.getAttributes("link").href ? "Update" : "Confirm"}
									</Button>
								</div>
							</div>
						</form>
					</div>
				</PopoverContent>
			</Popover>
		);
	},
);

LinkToolbar.displayName = "LinkToolbar";

export { LinkToolbar };