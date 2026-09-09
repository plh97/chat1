import React from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import {
  ButtonGroup,
  IconButton,
  Pagination,
} from "@/components/ui/chakra-compat";

interface AppPaginationProps {
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function AppPagination({
  count,
  page,
  pageSize,
  onPageChange,
  disabled = false,
}: AppPaginationProps): React.ReactNode {
  if (count <= pageSize) return null;

  return (
    <Pagination.Root
      count={count}
      page={page}
      pageSize={pageSize}
      siblingCount={1}
      onPageChange={(details) => onPageChange(details.page)}
    >
      <ButtonGroup size="sm" variant="outline" justifyContent="center">
        <Pagination.PrevTrigger asChild>
          <IconButton
            aria-label="Previous page"
            disabled={disabled}
            variant="outline"
          >
            <LuChevronLeft />
          </IconButton>
        </Pagination.PrevTrigger>
        <Pagination.Items
          render={(item) => (
            <IconButton
              aria-label={`Page ${item.value}`}
              disabled={disabled}
              variant={{ base: "outline", _selected: "solid" }}
            >
              {item.value}
            </IconButton>
          )}
        />
        <Pagination.NextTrigger asChild>
          <IconButton
            aria-label="Next page"
            disabled={disabled}
            variant="outline"
          >
            <LuChevronRight />
          </IconButton>
        </Pagination.NextTrigger>
      </ButtonGroup>
    </Pagination.Root>
  );
}
