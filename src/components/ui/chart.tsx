import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >['children'];
  }
>(({ id, className = '', children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  // Generate dynamic CSS variables for chart colors
  const colorStyles = React.useMemo(() => {
    return Object.entries(config)
      .filter(([, itemConfig]) => itemConfig.color)
      .map(
        ([key, itemConfig]) =>
          `--color-${key}: ${itemConfig.color};`
      )
      .join('\n');
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={`flex aspect-video justify-center text-xs ${className}`}
        style={
          Object.entries(config).reduce<Record<string, string>>(
            (acc, [key, item]) => {
              if (item.color) {
                acc[`--color-${key}`] = item.color;
              }
              return acc;
            },
            {}
          )
        }
        {...props}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-chart="${chartId}"] {\n${colorStyles}\n}`
          }}
        />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className = '',
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName = '',
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || 'value'}`;
      const itemConfig = config[key];
      const value =
        !labelKey && typeof label === 'string'
          ? config[label]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={`font-semibold text-white ${labelClassName}`}>
            {labelFormatter(value, payload)}
          </div>
        );
      }

      if (!value) {
        return <div className={`font-semibold text-white ${labelClassName}`}>{label}</div>;
      }

      return <div className={`font-semibold text-white ${labelClassName}`}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={`grid min-w-[8rem] items-start gap-1.5 rounded-2xl border border-neutral-700 bg-neutral-900/95 p-2.5 text-xs text-white shadow-2xl backdrop-blur-xl ${className}`}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = config[key];
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey || index}
                className="flex w-full items-center gap-2"
              >
                {!hideIndicator && (
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: indicatorColor
                    }}
                  />
                )}
                <div className="flex flex-1 justify-between gap-2 leading-none">
                  <span className="text-neutral-400">
                    {itemConfig?.label || item.name}
                  </span>
                  {item.value !== undefined && (
                    <span className="font-mono font-bold text-white">
                      {item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className = '', hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center gap-4 pt-3 ${
        verticalAlign === 'top' ? 'pb-3' : 'pt-3'
      } ${className}`}
    >
      {payload.map(item => {
        const key = `${nameKey || item.dataKey || 'value'}`;
        const itemConfig = config[key];

        return (
          <div
            key={item.value}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400"
          >
            {!hideIcon && (
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: item.color
                }}
              />
            )}
            <span className="text-neutral-300">{itemConfig?.label || item.value}</span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = 'ChartLegendContent';

const demoChartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const demoChartConfig = {
  desktop: {
    label: "Desktop",
    color: "#2563eb",
  },
  mobile: {
    label: "Mobile",
    color: "#60a5fa",
  },
} satisfies ChartConfig;

export function ChartBarDemoLegend() {
  return (
    <ChartContainer config={demoChartConfig} className="min-h-[200px] w-full">
      <RechartsPrimitive.BarChart accessibilityLayer data={demoChartData}>
        <RechartsPrimitive.CartesianGrid vertical={false} />
        <RechartsPrimitive.XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <RechartsPrimitive.Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
        <RechartsPrimitive.Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
      </RechartsPrimitive.BarChart>
    </ChartContainer>
  );
}
